/**
 * Identifiant local unique.
 *
 * `Date.now()` seul collisionne dès que deux enregistrements naissent dans la
 * même milliseconde (créations en boucle, double appui, ajout groupé) : deux
 * lignes partageaient alors le même id, ce qui les faisait s'écraser l'une
 * l'autre à la fusion et à l'upsert (`onConflict: user_id,id`).
 *
 * On combine trois sources :
 * - l'horodatage en base 36 (trié chronologiquement, court) ;
 * - un compteur monotone (unicité garantie dans un même processus) ;
 * - un suffixe aléatoire (unicité entre appareils et après redémarrage).
 *
 * Le format reste une chaîne sobre, acceptée par `id TEXT` côté Supabase.
 */
let counter = 0;

export function generateId() {
  counter = (counter + 1) % 0xffffff;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(4, '0');
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${time}-${seq}-${rand}`;
}
