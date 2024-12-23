import { WandererManager } from "garbo-lib";
import { getMonsters, myAdventures } from "kolmafia";
import { get, notNull } from "libram";

import { args, digitizedMonstersRemaining, getIslands } from "./lib";
import { garboValue } from "./value";

let _wanderer: WandererManager;
export function wanderer(): WandererManager {
  return (_wanderer ??= new WandererManager({
    ascend: args.ascend,
    estimatedTurns: myAdventures,
    itemValue: garboValue,
    // TODO: value NC and Res
    effectValue: () => 0,
    prioritizeCappingGuzzlr: false,
    freeFightExtraValue: () => 0,
    digitzesRemaining: digitizedMonstersRemaining,
    plentifulMonsters: [
      get("_sourceTerminalDigitizeMonster"),
      ...(getIslands().flatMap(({ location }) => getMonsters(location)) ?? []),
    ].filter(notNull),
  }));
}
