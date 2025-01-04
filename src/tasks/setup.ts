import { Quest } from "grimoire-kolmafia";
import {
  abort,
  changeMcd,
  cliExecute,
  currentMcd,
  getWorkshed,
  Item,
  itemAmount,
  myAdventures,
  myHp,
  myLevel,
  myMaxhp,
  myMaxmp,
  myMp,
  myPrimestat,
  putCloset,
  restoreMp,
  runChoice,
  totalTurnsPlayed,
  use,
  useFamiliar,
  useSkill,
  visitUrl,
} from "kolmafia";
import {
  $effect,
  $effects,
  $familiar,
  $familiars,
  $item,
  $locations,
  $skill,
  AprilingBandHelmet,
  AutumnAton,
  CrimboShrub,
  get,
  have,
  SongBoom,
  TakerSpace,
  uneffect,
} from "libram";

import { CrimboTask } from "../engine";
import { args, CMCEnvironment, countEnvironment, tryGetCMCItem } from "../lib";

const poisons = $effects`Hardly Poisoned at All, A Little Bit Poisoned, Somewhat Poisoned, Really Quite Poisoned, Majorly Poisoned`;
function cmcTarget(): { item: Item; environment: CMCEnvironment } {
  return {
    item: $item`Extrovermectin™`,
    environment: "i",
  };
}

export const SETUP_QUEST: Quest<CrimboTask> = {
  name: "Setup",
  tasks: [
    {
      name: "Beaten Up",
      completed: () => !have($effect`Beaten Up`),
      do: () => {
        if (["Poetic Justice", "Lost and Found"].includes(get("lastEncounter"))) {
          uneffect($effect`Beaten Up`);
        }
        if (have($effect`Beaten Up`)) {
          throw "Got beaten up for no discernable reason!";
        }
      },
      sobriety: "either",
    },
    {
      name: "Four-leaf potato sprout",
      completed: () => have($effect`Luck of St. Patrick`) || !have($item`four-leaf potato sprout`),
      do: () => use($item`four-leaf potato sprout`),
      sobriety: "either",
    },
    {
      name: "Disco Nap",
      ready: () => have($skill`Disco Nap`) && have($skill`Adventurer of Leisure`),
      completed: () => poisons.every((e) => !have(e)),
      do: () => useSkill($skill`Disco Nap`),
      sobriety: "either",
    },
    {
      name: "Antidote",
      completed: () => poisons.every((e) => !have(e)),
      do: () => poisons.forEach((e) => uneffect(e)),
      sobriety: "either",
    },
    {
      name: "Recover",
      ready: () => have($skill`Cannelloni Cocoon`),
      completed: () => myHp() / myMaxhp() >= 0.75,
      do: () => {
        useSkill($skill`Cannelloni Cocoon`);
      },
      sobriety: "either",
    },
    {
      name: "Recover Failed",
      completed: () => myHp() / myMaxhp() >= 0.5,
      do: () => {
        throw "Unable to heal above 50% HP, heal yourself!";
      },
      sobriety: "either",
    },
    {
      name: "Recover MP",
      completed: () => myMp() >= Math.min(250, myMaxmp()),
      do: () => restoreMp(300),
      sobriety: "sober",
    },
    {
      name: "Kgnee",
      completed: () =>
        !have($familiar`Reagnimated Gnome`) || have($item`gnomish housemaid's kgnee`),
      do: (): void => {
        visitUrl("arena.php");
        runChoice(4);
      },
      outfit: { familiar: $familiar`Reagnimated Gnome` },
      sobriety: "sober",
    },
    {
      name: "Decorations",
      completed: () => !args.shrub || !CrimboShrub.have() || get("_shrubDecorated"),
      do: () => {
        if (!have($item`box of old Crimbo decorations`)) useFamiliar($familiar`Crimbo Shrub`);
        CrimboShrub.decorate(myPrimestat().toString(), "Prismatic Damage", "Blocking", "Gifts");
      },
      sobriety: "either",
    },
    {
      name: "MCD",
      completed: () => !currentMcd(),
      do: () => changeMcd(0),
      sobriety: "either",
    },
    {
      name: "The Captain",
      completed: () => get("_mummeryMods").includes("Meat Drop"),
      ready: () =>
        have($item`mumming trunk`) && $familiars`Reagnimated Gnome, Temporal Riftlet`.some(have),
      sobriety: "either",
      do: () => {
        const fam = $familiars`Reagnimated Gnome, Temporal Riftlet`.find(have);
        if (fam) {
          useFamiliar(fam);
          cliExecute("mummery meat");
        } else abort("Something went wrong with the mumming trunk");
      },
    },
    {
      name: "Closet Sand Dollars",
      completed: () => itemAmount($item`sand dollar`) === 0,
      do: () => putCloset(itemAmount($item`sand dollar`), $item`sand dollar`),
      sobriety: "either",
    },
    {
      name: "Closet Hobo Nickels",
      completed: () =>
        itemAmount($item`hobo nickel`) === 0 ||
        (!have($familiar`Hobo Monkey`) && !have($item`hobo nickel`, 1000)),
      do: () => putCloset(itemAmount($item`hobo nickel`), $item`hobo nickel`),
      sobriety: "either",
    },
    {
      name: "Autumn-Aton",
      completed: () => AutumnAton.currentlyIn() !== null,
      do: (): void => {
        AutumnAton.sendTo(
          // eslint-disable-next-line libram/verify-constants
          $locations`Christmas Island, The Toxic Teacups, The Oasis, The Deep Dark Jungle, The Bubblin' Caldera, The Neverending Party, The Sleazy Back Alley`
        );
      },
      ready: () => AutumnAton.available() && AutumnAton.turnsForQuest() < myAdventures() + 10,
      sobriety: "either",
    },
    {
      name: "Cold Medicine Cabinent",
      completed: () =>
        getWorkshed() !== $item`cold medicine cabinet` ||
        totalTurnsPlayed() < get("_nextColdMedicineConsult") ||
        get("_coldMedicineConsults") >= 5 ||
        countEnvironment(cmcTarget().environment) <= 10,
      do: () => tryGetCMCItem(cmcTarget().item),
      sobriety: "either",
    },
    {
      name: "Deft Pirate Hook",
      completed: () => have($item`deft pirate hook`),
      ready: () => TakerSpace.canMake($item`deft pirate hook`),
      do: () => TakerSpace.make($item`deft pirate hook`),
      sobriety: "either",
    },
    {
      name: "Apriling Band",
      completed: () => have($effect`Apriling Band Patrol Beat`),
      ready: () => AprilingBandHelmet.canChangeSong(),
      do: () => AprilingBandHelmet.changeSong("Apriling Band Patrol Beat"),
      sobriety: "either",
    },
    {
      name: "Boombox",
      completed: () =>
        !SongBoom.have() ||
        SongBoom.song() === "Food Vibrations" ||
        SongBoom.songChangesLeft() === 0,
      do: () => SongBoom.setSong("Food Vibrations"),
      sobriety: "either",
    },
    {
      name: "Futuristic Gear",
      completed: () => have($item`futuristic shirt`),
      ready: () => have($item`wardrobe-o-matic`) && myLevel() >= 20,
      do: () => use($item`wardrobe-o-matic`),
      sobriety: "either",
    },
  ],
};
