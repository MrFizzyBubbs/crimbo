import { Args } from "grimoire-kolmafia";
import { print, toInt } from "kolmafia";
import {
  $slots,
  Session,
  setDefaultMaximizeOptions,
  sinceKolmafiaRevision,
  withProperty,
} from "libram";

import { CrimboEngine } from "./engine";
import ISLANDS from "./islands";
import { args, printh } from "./lib";
import Tasks from "./tasks";

export function main(command?: string) {
  Args.fill(args, command);
  for (const island of Object.values(ISLANDS)) {
    if (island.avoidMonsters.length === 0) {
      print(`Error! Island ${island.location} has 0 monsters to waffle from!`, "red");
    } else if (island.avoidMonsters.some((m) => !m || toInt(m) <= 2453)) {
      print(`Error! Island ${island.location} has an invalid monster!`, "red");
    }
  }

  if (args.help) {
    Args.showHelp(args);
    return;
  }

  setDefaultMaximizeOptions({ preventSlot: $slots`crown-of-thrones, buddy-bjorn` });

  sinceKolmafiaRevision(27753);

  const engine = new CrimboEngine(Tasks);
  engine.print();

  const sessionStart = Session.current();

  withProperty("recoveryScript", "", () => {
    try {
      engine.run();
    } finally {
      engine.destruct();
    }
  });

  const sessionResults = Session.current().diff(sessionStart);

  printh(`SESSION RESULTS:`);
  for (const [item, count] of sessionResults.items.entries()) {
    printh(`ITEM ${item} QTY ${count}`);
  }
}
