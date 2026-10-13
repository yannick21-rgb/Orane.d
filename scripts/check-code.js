#!/usr/bin/env node
/**
 * scripts/check-code.js
 *
 * Garde-fou statique du carnet :.attrape, avant le moindre `expo start`, les
 * erreurs qui ne se voient qu'à l'exécution sur un écran — le genre de bug
 * qui affiche « Property 'cardP' doesn't exist » sur l'écran Réglages et pas
 * dans la console Metro.
 *
 * Les sept contrôles, tous par analyse de l'AST (@babel/parser + @babel/traverse,
 * déjà présents via Metro) :
 *
 *   1. identifiant libre        → `styles` utilisé dans un composant qui ne le
 *                                 reçoit pas, `cardP` oublié, `t` sans
 *                                 `useTranslation()`… tous finissent en
 *                                 ReferenceError au rendu.
 *   2. composant JSX non importé → « Element type is invalid ».
 *   3. clé de StyleSheet absente → style ignoré silencieusement par RN.
 *   4. import nommé inexistant  → `undefined` à l'exécution.
 *   5. arité de createStyles    → paramètre manquant = style `undefined`.
 *   6. clé absente du Provider  → `undefined` destructuré depuis un contexte.
 *   7. prop requise non passée  → le composant lit `undefined`.
 *
 * Usage :
 *   node scripts/check-code.js            # src/
 *   node scripts/check-code.js App.js     # en plus
 *   node scripts/check-code.js --strict   # les avertissements comptent aussi
 *
 * Code de sortie 1 si quelque chose est à corriger (2 si la@avertissement
 * seulement en mode normal). À brancher sur un hook pre-commit ou dans une
 * tâche CI : `npm run check`.
 */

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = 'src';
const EXTRA = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const STRICT = process.argv.includes('--strict');

/* ------------------------------------------------------------------ */
/* Utilitaires                                                        */
/* ------------------------------------------------------------------ */

const GLOBALS = new Set([
  'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error',
  'TypeError', 'RangeError', 'SyntaxError', 'parseInt', 'parseFloat', 'isNaN',
  'isFinite', 'undefined', 'NaN', 'Infinity', 'globalThis', 'global',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'fetch',
  'Response', 'Request', 'Headers', 'AbortController', 'AbortSignal', 'URL',
  'URLSearchParams', 'TextEncoder', 'TextDecoder', 'Intl', 'Symbol', 'Proxy',
  'Reflect', 'ArrayBuffer', 'Uint8Array', 'Int32Array', 'Float64Array',
  'structuredClone', 'process', 'Buffer', 'setImmediate', 'clearImmediate',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'BigUint64Array', 'DataView', 'WeakRef', 'FinalizationRegistry',
  '__DEV__', 'arguments', 'require', 'module', 'exports', 'window', 'document',
  'navigator', 'location', 'performance', 'crypto', 'atob', 'btoa',
  'ResizeObserver', 'Blob', 'File', 'FileReader', 'FormData', 'alert',
]);

const findings = [];
const rel = (file) => path.relative(process.cwd(), file) || file;
const report = (file, line, kind, message, code) => {
  findings.push({ file: rel(file), line, kind, message, code });
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(js|jsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function parseCode(code) {
  return parser.parse(code, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
  });
}

const files = [...walk(ROOT), ...EXTRA].map((f) => path.resolve(f));
const sources = files.map((file) => {
  const code = fs.readFileSync(file, 'utf8');
  try {
    return { file, code, ast: parseCode(code), lines: code.split('\n') };
  } catch (err) {
    report(file, err.loc?.line ?? 0, 'syntax', err.message);
    return null;
  }
}).filter(Boolean);

for (const s of sources) s.src = (n) => (s.lines[n - 1] || '').trim();

/* ------------------------------------------------------------------ */
/* 1 + 2 — identifiants libres et composants JSX non déclarés          */
/* ------------------------------------------------------------------ */

for (const s of sources) {
  traverse(s.ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (GLOBALS.has(name)) return;
      if (p.scope.hasBinding(name, true)) return;
      report(s.file, p.node.loc?.start.line ?? 0, 'libre',
        `« ${name} » n'existe pas ici (ReferenceError au rendu)`, s.src(p.node.loc?.start.line ?? 1));
    },
    JSXIdentifier(p) {
      const name = p.node.name;
      if (!name || !/^[A-Z]/.test(name)) return;
      if (GLOBALS.has(name)) return;
      const parent = p.parent;
      if (parent && parent.type === 'JSXMemberExpression' && parent.property === p.node) return;
      if (parent && parent.type === 'JSXOpeningElement') {
        if (p.parentPath.scope.hasBinding(name, true)) return;
        report(s.file, p.node.loc?.start.line ?? 0, 'composant',
          `<${name}> n'est ni importé ni défini dans ce fichier`, s.src(p.node.loc?.start.line ?? 1));
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/* 3 — clés de StyleSheet utilisées mais jamais définies                */
/* ------------------------------------------------------------------ */

function styleKeysOf(obj, bound, seen = new Set()) {
  const keys = new Set();
  for (const p of obj.properties) {
    if (p.type === 'ObjectProperty' && !p.computed) keys.add(p.key.name ?? p.key.value);
    else if (p.type === 'SpreadElement') {
      if (p.argument.type === 'ObjectExpression') {
        for (const k of styleKeysOf(p.argument, bound, seen)) keys.add(k);
      } else if (p.argument.type === 'Identifier' && bound.has(p.argument.name) && !seen.has(p.argument.name)) {
        seen.add(p.argument.name);
        for (const k of styleKeysOf(bound.get(p.argument.name), bound, seen)) keys.add(k);
      }
    }
  }
  return keys;
}

const isStyleFactoryCall = (init) =>
  init.type === 'CallExpression' &&
  ((init.callee.type === 'Identifier' && /^create[A-Za-z]*[Ss]tyles$/.test(init.callee.name)) ||
    (init.callee.type === 'MemberExpression' && init.callee.object.name === 'StyleSheet'));

/** Trouve l'objet passé à `StyleSheet.create` dans le corps d'une usine. */
function findStyleSheetCreateArg(root) {
  let found = null;
  const walkNode = (n) => {
    if (!n || found || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walkNode);
    if (n !== root && (n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression' || n.type === 'FunctionDeclaration')) {
      return; // ne jamais piquer l'objet d'une usine imbriquée
    }
    if (
      n.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      n.callee.object.name === 'StyleSheet' &&
      n.callee.property.name === 'create' &&
      n.arguments[0]?.type === 'ObjectExpression'
    ) {
      found = n.arguments[0];
      return;
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      walkNode(n[k]);
    }
  };
  walkNode(root);
  return found;
}

for (const s of sources) {
  const sheets = new Map(); // nom -> ObjectExpression (StyleSheet.create)
  const literals = new Map(); // nom -> objet literal (sert à résoudre les spreads)

  // Deux passes : dans les écrans, `const styles = createStyles(...)` est
  // souvent écrit AVANT la définition de l'usine (en bas de fichier).
  for (let pass = 0; pass < 2; pass++) {
    traverse(s.ast, {
      VariableDeclarator(p) {
        const { id, init } = p.node;
        if (id.type !== 'Identifier' || !init) return;

        if (init.type === 'ObjectExpression') {
          literals.set(id.name, init);
          return;
        }

        const direct =
          init.type === 'CallExpression' &&
          init.callee.type === 'MemberExpression' &&
          init.callee.object.name === 'StyleSheet' &&
          init.callee.property.name === 'create';
        if (direct) {
          if (init.arguments[0]?.type === 'ObjectExpression') sheets.set(id.name, init.arguments[0]);
          return;
        }

        // const createStyles = (…) => StyleSheet.create({ … })
        if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
          const obj = findStyleSheetCreateArg(init);
          if (obj) sheets.set(id.name, obj);
          return;
        }

        // const styles = createStyles(…)  — ou simple alias
        const callee =
          init.type === 'CallExpression' && init.callee.type === 'Identifier'
            ? init.callee.name
            : init.type === 'Identifier'
              ? init.name
              : null;
        if (callee && sheets.has(callee)) sheets.set(id.name, sheets.get(callee));
      },
    });
  }
  if (!sheets.size) continue;

  const bound = new Map([...sheets, ...literals]);
  const allKeys = new Set();
  for (const obj of sheets.values()) for (const k of styleKeysOf(obj, bound)) allKeys.add(k);

  const seen = new Set();
  traverse(s.ast, {
    MemberExpression(p) {
      const { object, property, computed } = p.node;
      if (object.type !== 'Identifier' || computed || property.type !== 'Identifier') return;
      if (object.name !== 'styles' && !sheets.has(object.name)) return;
      if (allKeys.has(property.name)) return;
      const line = p.node.loc.start.line;
      const kk = `${line}:${object.name}.${property.name}`;
      if (seen.has(kk)) return;
      seen.add(kk);
      report(s.file, line, 'style',
        `${object.name}.${property.name} n'existe pas dans le StyleSheet`, s.src(line));
    },
  });
}

/* ------------------------------------------------------------------ */
/* 4 — imports nommés absents du module cible                           */
/* ------------------------------------------------------------------ */

const astByFile = new Map(sources.map((s) => [s.file, s]));

function resolveLocal(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.js', path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function exportedNames(file, seen = new Set()) {
  if (seen.has(file) || !astByFile.has(file)) return null;
  seen.add(file);
  const { ast } = astByFile.get(file);
  const names = new Set();
  let hasDefault = false;
  traverse(ast, {
    ExportDefaultDeclaration() { hasDefault = true; },
    ExportNamedDeclaration(p) {
      const d = p.node.declaration;
      if (!d) {
        for (const sp of p.node.specifiers || []) {
          const ex = sp.exported;
          names.add(ex.type === 'Identifier' ? ex.name : ex.value);
        }
        return;
      }
      if (d.type === 'VariableDeclaration') {
        for (const decl of d.declarations) {
          if (decl.id.type === 'Identifier') names.add(decl.id.name);
          else if (decl.id.type === 'ObjectPattern')
            for (const pr of decl.id.properties) if (pr.key?.name) names.add(pr.key.name);
        }
      } else if (d.id?.name) names.add(d.id.name);
    },
    ExportAllDeclaration() { names.add('*'); },
  });
  return { names, hasDefault };
}

for (const s of sources) {
  traverse(s.ast, {
    ImportDeclaration(p) {
      const spec = p.node.source.value;
      const target = resolveLocal(s.file, spec);
      if (!target) return;
      const info = exportedNames(target);
      if (!info) return;
      for (const sp of p.node.specifiers) {
        const line = p.node.loc.start.line;
        if (sp.type === 'ImportDefaultSpecifier') {
          if (!info.hasDefault && info.names.size && !info.names.has('default'))
            report(s.file, line, 'import', `« ${spec} » n'a pas d'export par défaut`, s.src(line));
          continue;
        }
        if (sp.type !== 'ImportSpecifier') continue;
        const imported = sp.imported.name ?? sp.imported.value;
        if (info.names.has('*')) continue; // ré-export : indécidable statiquement
        if (!info.names.has(imported))
          report(s.file, line, 'import',
            `« ${imported} » n'est pas exporté par ${spec} (donc undefined)`, s.src(line));
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/* 5 — arité des fabriques de styles                                    */
/* ------------------------------------------------------------------ */

const factories = new Map(); // "fichier::nom" -> signature
const globalFactories = new Map();

for (const s of sources) {
  const record = (name, node, file) => {
    const sig = { params: node.params, file };
    factories.set(`${file}::${name}`, sig);
    if (!globalFactories.has(name)) globalFactories.set(name, sig);
  };
  traverse(s.ast, {
    FunctionDeclaration(p) {
      const n = p.node.id?.name;
      if (n && /^create[A-Za-z]*[Ss]tyles$/.test(n)) record(n, p.node, s.file);
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.type !== 'Identifier' || !init || !init.params) return;
      if (!/^create[A-Za-z]*[Ss]tyles$/.test(id.name)) return;
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')
        record(id.name, init, s.file);
    },
  });
}

for (const s of sources) {
  traverse(s.ast, {
    CallExpression(p) {
      const name = p.node.callee.type === 'Identifier' ? p.node.callee.name : null;
      if (!name || !/^create[A-Za-z]*[Ss]tyles$/.test(name)) return;
      const f = factories.get(`${s.file}::${name}`) || globalFactories.get(name);
      if (!f) return;
      const hasRest = f.params.some((x) => x.type === 'RestElement');
      const got = p.node.arguments.length;
      const expected = f.params.length;
      if (hasRest ? got >= expected : got === expected) return;
      const line = p.node.loc.start.line;
      report(s.file, line, 'arite',
        `${name}() attend ${expected} argument(s), en reçoit ${got} → style undefined`,
        s.src(line));    },
  });
}

/* ------------------------------------------------------------------ */
/* 6 — clés demandées à un contexte absentes de la valeur du Provider   */
/* ------------------------------------------------------------------ */

const providerKeys = new Map();
const providerSpread = new Map();
const hookToCtx = new Map();

for (const s of sources) {
  traverse(s.ast, {
    JSXOpeningElement(p) {
      const n = p.node.name;
      if (n.type !== 'JSXMemberExpression' || n.property.name !== 'Provider') return;
      const attr = (p.node.attributes || []).find(
        (a) => a.type === 'JSXAttribute' && a.name.name === 'value'
      );
      if (!attr?.value || attr.value.type !== 'JSXExpressionContainer') return;
      const expr = attr.value.expression;
      if (expr.type !== 'ObjectExpression') return;
      const keys = new Set();
      let spread = false;
      for (const prop of expr.properties) {
        if (prop.type === 'SpreadElement') spread = true;
        else if (prop.type === 'ObjectProperty' && !prop.computed) keys.add(prop.key.name ?? prop.key.value);
      }
      providerKeys.set(n.object.name, keys);
      providerSpread.set(n.object.name, spread);
    },
  });
}

// le hook est relié à son contexte dans une passe séparée : les Consumers
// (écrans) sont souvent lus avant que le Provider (viewmodel) soit analysé.
const ctxNames = [...providerKeys.keys()];
for (const s of sources) {
  traverse(s.ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== 'Identifier' || !/^use[A-Z]/.test(c.name)) return;
      const found = ctxNames.find((ctx) => ctx.startsWith(c.name.slice(3)));
      if (found) hookToCtx.set(c.name, found);
    },
  });
}

for (const s of sources) {
  traverse(s.ast, {
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.type !== 'ObjectPattern' || !init || init.type !== 'CallExpression') return;
      const c = init.callee;
      if (c.type !== 'Identifier' || !/^use[A-Z]/.test(c.name)) return;
      const ctx = hookToCtx.get(c.name);
      const available = ctx ? providerKeys.get(ctx) : null;
      if (!available || providerSpread.get(ctx)) return;
      const wanted = id.properties
        .filter((x) => x.type === 'ObjectProperty' && !x.computed && x.key.type === 'Identifier')
        .map((x) => x.key.name);
      const missing = wanted.filter((k) => !available.has(k));
      if (!missing.length) return;
      const line = p.node.loc.start.line;
      report(s.file, line, 'contexte',
        `${c.name}() ne fournit pas : ${missing.join(', ')}`, s.src(line));
    },
  });
}

/* ------------------------------------------------------------------ */
/* 7 — props requises d'un composant local, non passées                 */
/* ------------------------------------------------------------------ */

function returnsJsx(node) {
  let found = false;
  const scan = (n) => {
    if (!n || typeof n !== 'object' || found) return;
    if (Array.isArray(n)) return n.forEach(scan);
    if (n.type === 'JSXElement') return void (found = true);
    for (const k of Object.keys(n)) {
      if (k === 'loc') continue;
      scan(n[k]);
    }
  };
  scan(node);
  return found;
}

function requiredProps(param) {
  if (!param || param.type !== 'ObjectPattern') return null;
  const required = new Set();
  for (const p of param.properties) {
    if (p.type !== 'ObjectProperty' || p.computed) continue;
    if (p.value !== null && p.value.type === 'AssignmentPattern') continue; // valeur par défaut
    const key = p.key.name ?? p.key.value;
    if (key === 'children') continue; // fourni par le contenu JSX
    required.add(key);
  }
  return required;
}

for (const s of sources) {
  const comps = new Map();
  const add = (name, node) => {
    const req = requiredProps(node.params[0]);
    if (req && req.size) comps.set(name, req);
  };
  traverse(s.ast, {
    FunctionDeclaration(p) {
      const n = p.node.id?.name;
      if (n && /^[A-Z]/.test(n) && p.node.params.length && returnsJsx(p.node.body)) add(n, p.node);
    },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.type !== 'Identifier' || !init || !init.params?.length) return;
      if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return;
      if (/^[A-Z]/.test(id.name) && returnsJsx(init.body)) add(id.name, init);
    },
  });
  if (!comps.size) continue;

  const seen = new Set();
  traverse(s.ast, {
    JSXOpeningElement(p) {
      if (p.node.name.type !== 'JSXIdentifier') return;
      const req = comps.get(p.node.name.name);
      if (!req) return;
      const provided = new Set();
      let spread = false;
      for (const a of p.node.attributes || []) {
        if (a.type === 'JSXSpreadAttribute') spread = true;
        else if (a.type === 'JSXAttribute') provided.add(a.name.name);
      }
      if (spread) return;
      const missing = [...req].filter((k) => !provided.has(k));
      if (!missing.length) return;
      const line = p.node.loc.start.line;
      const kk = `${line}:${missing.join()}`;
      if (seen.has(kk)) return;
      seen.add(kk);
      report(s.file, line, 'props',
        `<${p.node.name.name}> ne reçoit pas : ${missing.join(', ')}`, s.src(line));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Verdict                                                            */
/* ------------------------------------------------------------------ */

const IGNORE = new Set(['style']); // style manquant = rendu sans style, pas un crash
const real = findings.filter((f) => !IGNORE.has(f.kind === 'props' ? f.message.split(' ')[0] : ''));

if (!findings.length) {
  console.log(`✓ ${files.length} fichiers analysés — rien à signaler.`);
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

console.log(`${findings.length} problème(s) dans ${byFile.size} fichier(s) :\n`);
for (const [file, list] of byFile) {
  console.log(file);
  for (const f of list.sort((a, b) => a.line - b.line)) {
    console.log(`  L${f.line}  [${f.kind}] ${f.message}`);
    if (f.code) console.log(`        ${f.code.slice(0, 104)}`);
  }
  console.log('');
}

process.exit(real.length || STRICT ? 1 : 2);
