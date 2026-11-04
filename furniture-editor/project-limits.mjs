/** Import resource budget, not a gameplay or performance guarantee.
 * Draft backups do not use the gameplay parser and can preserve rejected work.
 */
export const MAX_FURNITURE_RECORDS=2000;
export function furnitureRecordCount(f){
 if(!f||!['placements','added','removed'].every(k=>Array.isArray(f[k])))return null;
 return f.placements.length+f.added.length+f.removed.length;
}
