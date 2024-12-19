import { Args, getTasks, Quest } from "grimoire-kolmafia";
import {
  canAdventure,
  cliExecute,
  inebrietyLimit,
  myAdventures,
  myClass,
  myInebriety,
  myTurncount,
  totalTurnsPlayed,
} from "kolmafia";
import {
  $class,
  $effect,
  $item,
  $items,
  $location,
  $monsters,
  $skill,
  $slots,
  Counter,
  get,
  getKramcoWandererChance,
  have,
  Session,
  setDefaultMaximizeOptions,
  sinceKolmafiaRevision,
  withProperty,
} from "libram";

import { CrimboEngine, CrimboQuest, CrimboStrategy, CrimboTask } from "./engine";
import { args, getIsland, printh, validateAndSetOrbTarget, validateAndSetSniffTarget } from "./lib";
import Macro from "./macro";
import { chooseQuestOutfit } from "./outfit";
import { setup } from "./setup";
import { wanderer } from "./wanderer";
import * as QUESTS from "./zones";

export function main(command?: string) {
  Args.fill(args, command);

  if (args.help) {
    Args.showHelp(args);
    return;
  }

  setDefaultMaximizeOptions({ preventSlot: $slots`crown-of-thrones, buddy-bjorn` });

  sinceKolmafiaRevision(27753);
  const turncount = myTurncount();
  const completed =
    args.turns > 0
      ? () => myTurncount() - turncount >= args.turns || myAdventures() === 0
      : () => myAdventures() === -args.turns;

  let digitizes = get("_sourceTerminalDigitizeMonsterCount");

  const global: Quest<CrimboTask> = {
    name: "Merry Crimbo!",
    completed,
    tasks: [
      {
        name: "June Cleaver",
        ready: () => have($item`June cleaver`) && get("_juneCleaverFightsLeft") === 0,
        do: myInebriety() <= inebrietyLimit() ? $location`Noob Cave` : $location`Drunken Stupor`,
        outfit: { weapon: $item`June cleaver` },
        completed: () => get("_juneCleaverFightsLeft") > 0,
        sobriety: "either",
        combat: new CrimboStrategy(() => Macro.abort()),
      },
      {
        name: "Proton Ghost",
        ready: () =>
          have($item`protonic accelerator pack`) &&
          get("questPAGhost") !== "unstarted" &&
          !!get("ghostLocation"),
        do: () => {
          const location = get("ghostLocation");
          if (location) {
            return location
          } else {
            throw "Could not determine Proton Ghost location!";
          }
        },
        outfit: () =>
          chooseQuestOutfit(
            { location: get("ghostLocation") ?? $location.none, isFree: true },
            {
              back: $item`protonic accelerator pack`,
              avoid:
                get("ghostLocation") === $location`The Icy Peak`
                  ? $items`Great Wolf's beastly trousers`
                  : [],
            }
          ),
        completed: () => get("questPAGhost") === "unstarted",
        combat: new CrimboStrategy(() =>
          Macro.trySkill($skill`Sing Along`)
            .trySkill($skill`Shoot Ghost`)
            .trySkill($skill`Shoot Ghost`)
            .trySkill($skill`Shoot Ghost`)
            .trySkill($skill`Trap Ghost`)
        ),
        sobriety: "sober",
      },
      {
        name: "Grey You Attack Skill",
        completed: () =>
          have($skill`Nantlers`) || have($skill`Nanoshock`) || have($skill`Audioclasm`),
        do: $location`The Haunted Storage Room`,
        ready: () =>
          myClass() === $class`Grey Goo` && canAdventure($location`The Haunted Storage Room`),
        combat: new CrimboStrategy(() => Macro.attack().repeat()),
        sobriety: "sober",
      },
      {
        name: "Vote Wanderer",
        ready: () =>
          have($item`"I Voted!" sticker`) &&
          totalTurnsPlayed() % 11 === 1 &&
          get("lastVoteMonsterTurn") < totalTurnsPlayed() &&
          get("_voteFreeFights") < 3,
        do: () => wanderer().getTarget("wanderer"),
        outfit: () =>
          chooseQuestOutfit(
            { location: wanderer().getTarget("wanderer"), isFree: true },
            { acc3: $item`"I Voted!" sticker` }
          ),
        completed: () => get("lastVoteMonsterTurn") === totalTurnsPlayed(),
        combat: new CrimboStrategy(() => Macro.redigitize().standardCombat()),
        sobriety: "either",
      },
      {
        name: "Digitize Wanderer",
        ready: () => Counter.get("Digitize") <= 0,
        outfit: () =>
          chooseQuestOutfit({
            location: wanderer().getTarget("wanderer"),
            isFree: get("_sourceTerminalDigitizeMonster")?.attributes.includes("FREE"),
          }),
        completed: () => get("_sourceTerminalDigitizeMonsterCount") !== digitizes,
        do: () => wanderer().getTarget("wanderer"), post: () => digitizes = get("_sourceTerminalDigitizeMonsterCount"),
        combat: new CrimboStrategy(() => Macro.redigitize().standardCombat()),
        sobriety: "either",
      },
      {
        name: "Void Monster",
        ready: () =>
          have($item`cursed magnifying glass`) && get("cursedMagnifyingGlassCount") === 13,
        completed: () => get("_voidFreeFights") >= 5,
        outfit: () =>
          chooseQuestOutfit(
            { location: wanderer().getTarget("wanderer"), isFree: true },
            { offhand: $item`cursed magnifying glass` }
          ),
        do: () => wanderer().getTarget("wanderer"),
        sobriety: "either",
        combat: new CrimboStrategy(() => Macro.standardCombat()),
      },
      {
        name: "Sausage Goblin",
        ready: () => have($item`Kramco Sausage-o-Matic™`) && getKramcoWandererChance() >= 1,
        completed: () => getKramcoWandererChance() < 1,
        outfit: () =>
          chooseQuestOutfit(
            { location: wanderer().getTarget("wanderer"), isFree: true },
            { offhand: $item`Kramco Sausage-o-Matic™` }
          ),
        do: () => wanderer().getTarget("wanderer"),
        sobriety: "either",
        combat: new CrimboStrategy(() => Macro.standardCombat()),
      },
      {
        name: "Spit Jurassic Acid",
        completed: () => have($effect`Everything Looks Yellow`),
        ready: () => have($item`Jurassic Parka`) && have($skill`Torso Awareness`),
        outfit: () =>
          chooseQuestOutfit(
            { location: getIsland().location, isFree: true },
            { shirt: $item`Jurassic Parka` }
          ),
        prepare: () => cliExecute("parka dilophosaur"),
        do: () => getIsland().location,
        combat: new CrimboStrategy(() => {
          const romance = get("romanticTarget");
          const freeMonsters = $monsters`sausage goblin`;
          if (romance?.attributes.includes("FREE")) freeMonsters.push(romance);
          return Macro.if_(freeMonsters, Macro.standardCombat())
            .skill($skill`Spit jurassic acid`)
            .abort();
        }),
        sobriety: "sober",
      },
    ],
  };

  const engine = new CrimboEngine(getTasks([setup, global, quest]));
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
