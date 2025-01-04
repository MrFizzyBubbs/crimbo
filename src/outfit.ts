import { DraggableFight } from "garbo-lib";
import { Outfit, OutfitSlot, OutfitSpec } from "grimoire-kolmafia";
import {
  canEquip,
  canInteract,
  Familiar,
  getMonsters,
  inebrietyLimit,
  Item,
  itemAmount,
  Location,
  myInebriety,
  myPrimestat,
  toSlot,
  totalTurnsPlayed,
} from "kolmafia";
import {
  $familiar,
  $familiars,
  $item,
  $phylum,
  $slot,
  $stat,
  CrystalBall,
  get,
  getRemainingStomach,
  have,
  sumNumbers,
  TearawayPants,
} from "libram";

import { freeFightFamiliar, MenuOptions } from "./familiar";
import { args, getIsland, realmAvailable, shouldPickpocket, sober } from "./lib";
import { garboValue } from "./value";
import { wanderer } from "./wanderer";

export function ifHave(
  slot: OutfitSlot,
  item: Item | undefined,
  condition?: () => boolean
): OutfitSpec {
  return item && have(item) && canEquip(item) && (condition?.() ?? true)
    ? Object.fromEntries([[slot, item]])
    : {};
}

export const drunkSpec = sober() ? {} : { offhand: $item`Drunkula's wineglass` };

export const orbSpec = () => {
  if (!CrystalBall.have()) return {};
  const island = getIsland();

  const prediction = CrystalBall.getPrediction().get(island.location);
  if (!prediction || prediction === island.orbTarget) return { famequip: CrystalBall.orb };
  return {};
};

function mergeSpecs(...outfits: OutfitSpec[]): OutfitSpec {
  return outfits.reduce((current, next) => ({ ...next, ...current }), {});
}

const adventuresFamiliars = (allowEquipment?: boolean) =>
  allowEquipment && have($item`gnomish housemaid's kgnee`)
    ? $familiars`Temporal Riftlet, Reagnimated Gnome`
    : $familiars`Temporal Riftlet`;
const chooseFamiliar = (options: MenuOptions = {}): Familiar => {
  if (options.location?.zone === "Holiday Islands") {
    if (args.shrub && get("shrubGifts") === "gifts") return $familiar`Crimbo Shrub`;

    const adventuresFamiliar = adventuresFamiliars(options.allowEquipment).find(have);
    if (adventuresFamiliar) return adventuresFamiliar;

    if (have($familiar`Peace Turkey`)) return $familiar`Peace Turkey`;
  }
  return (
    (canInteract() && sober() ? adventuresFamiliars(options.allowEquipment) : []).find((f) =>
      have(f)
    ) ?? freeFightFamiliar(options)
  );
};

type TaskOptions = { wandererType: DraggableFight | Location; isFree?: boolean };
export function wandererOutfit(
  { wandererType, isFree }: TaskOptions,
  ...outfits: OutfitSpec[]
): OutfitSpec {
  const location =
    wandererType instanceof Location ? wandererType : wanderer().getTarget(wandererType);
  const mergedOutfits = mergeSpecs(...outfits);
  const familiar = chooseFamiliar({ location, allowEquipment: !("famequip" in mergedOutfits) });
  const famEquip = mergeSpecs(
    ifHave("famequip", equipmentFamiliars.get(familiar)),
    ifHave("famequip", $item`tiny stillsuit`),
    ifHave("famequip", $item`amulet coin`)
  );

  const weapons = mergeSpecs(
    ifHave("weapon", $item`June cleaver`),
    ifHave("weapon", $item`Fourth of May Cosplay Saber`)
  );
  const offhands = mergeSpecs(
    ifHave("offhand", $item`carnivorous potted plant`),
    ifHave(
      "offhand",
      $item`cursed magnifying glass`,
      () => !isFree && get("_voidFreeFights") < 5 && get("cursedMagnifyingGlassCount") < 13
    )
  );

  const backs = mergeSpecs(
    ifHave(
      "back",
      $item`protonic accelerator pack`,
      () =>
        get("questPAGhost") === "unstarted" &&
        get("nextParanormalActivity") <= totalTurnsPlayed() &&
        sober()
    ),
    ifHave("back", $item`Buddy Bjorn`)
  );
  const spec = mergeSpecs(
    ifHave("hat", $item`Crown of Thrones`, () => !have($item`Buddy Bjorn`)),
    weapons,
    offhands,
    backs,
    { familiar },
    famEquip,
    ifHave(
      "pants",
      $item`designer sweatpants`,
      () => 25 * get("_sweatOutSomeBoozeUsed") + get("sweat") < 75
    ),
    ifHave(
      "pants",
      $item`Pantsgiving`,
      () =>
        get("_pantsgivingCount") < 50 ||
        (get("_pantsgivingFullness") < 2 && getRemainingStomach() === 0)
    ),
    { modifier: "Familiar Weight" }
  );

  const bestAccessories = getBestAccessories(location, isFree);
  for (let i = 0; i < 3; i++) {
    const accessory = bestAccessories[i];
    if (!accessory) break;
    spec[`acc${i + 1}` as OutfitSlot] = accessory;
  }
  const mergedSpec = mergeSpecs(...outfits, spec);

  const [goodFammy, lessGoodFammy] = [$item`Buddy Bjorn`, $item`Crown of Thrones`];
  const lessGoodSlot = toSlot(lessGoodFammy).toString() as OutfitSlot;
  if (!have(goodFammy) && have(lessGoodFammy) && !(lessGoodSlot in mergedSpec)) {
    mergedSpec[lessGoodSlot] = lessGoodFammy;
  } else {
    mergedSpec.avoid = [...(mergedSpec.avoid ?? []), lessGoodFammy];
  }

  return mergedSpec;
}

const equipmentFamiliars = new Map<Familiar, Item>([
  [$familiar`Reagnimated Gnome`, $item`gnomish housemaid's kgnee`],
  [$familiar`Shorter-Order Cook`, $item`blue plate`],
  [$familiar`Stocking Mimic`, $item`bag of many confections`],
]);

function luckyGoldRing() {
  // Volcoino has a low drop rate which isn't accounted for here
  // Overestimating until it drops is probably fine, don't @ me
  const dropValues = [
    100, // 80 - 120 meat
    ...[
      itemAmount($item`hobo nickel`) > 0 ? 100 : 0, // This should be closeted
      itemAmount($item`sand dollar`) > 0 ? garboValue($item`sand dollar`) : 0, // This should be closeted
      itemAmount($item`Freddy Kruegerand`) > 0 ? garboValue($item`Freddy Kruegerand`) : 0,
      realmAvailable("sleaze") ? garboValue($item`Beach Buck`) : 0,
      realmAvailable("spooky") ? garboValue($item`Coinspiracy`) : 0,
      realmAvailable("stench") ? garboValue($item`FunFunds™`) : 0,
      realmAvailable("hot") && !get("_luckyGoldRingVolcoino") ? garboValue($item`Volcoino`) : 0,
      realmAvailable("cold") ? garboValue($item`Wal-Mart gift certificate`) : 0,
      realmAvailable("fantasy") ? garboValue($item`Rubee™`) : 0,
    ].filter((value) => value > 0),
  ];

  // Items drop every ~10 turns
  return sumNumbers(dropValues) / dropValues.length / 10;
}

type AccessoryOptions = { location: Location; isFree?: boolean };
const accessories: { item: Item; valueFunction: (options: AccessoryOptions) => number }[] = [
  {
    item: $item`mafia thumb ring`,
    valueFunction: ({ isFree }) => (!isFree ? (1 / 0.96 - 1) * get("valueOfAdventure") : 0),
  },
  {
    item: $item`lucky gold ring`,
    valueFunction: luckyGoldRing,
  },
  {
    item: $item`Mr. Screege's spectacles`,
    valueFunction: () => 180,
  },
  {
    item: $item`Mr. Cheeng's spectacles`,
    valueFunction: () => 220,
  },
];

function getBestAccessories(location: Location, isFree?: boolean) {
  return accessories
    .filter(({ item }) => have(item) && canEquip(item))
    .map(({ item, valueFunction }) => ({ item, value: valueFunction({ location, isFree }) }))
    .sort(({ value: a }, { value: b }) => b - a)
    .map(({ item }) => item)
    .splice(0, 3);
}

export function islandOutfit(
  fight: "freekill" | "freerun" | "regular",
  baseSpec: OutfitSpec = {}
): Outfit {
  const outfit = Outfit.from(
    baseSpec,
    new Error(`Failed to construct outfit from spec: ${baseSpec}`)
  );
  const island = getIsland();
  const usingOrb =
    fight !== "freerun" &&
    CrystalBall.have() &&
    [undefined, island.orbTarget].includes(CrystalBall.getPrediction().get(island.location));

  if (usingOrb) outfit.equip(CrystalBall.orb);

  outfit.familiar ??= chooseFamiliar({
    location: island.location,
    allowEquipment: !usingOrb,
    allowAttackFamiliars: fight === "regular",
  });

  if (outfit.familiar === $familiar`Reagnimated Gnome`)
    outfit.equip($item`gnomish housemaid's kgnee`);

  // acc1 reserved for outfit args
  // acc2 used here
  // acc3 for thumb ring
  if (shouldPickpocket() && myPrimestat() !== $stat`Moxie`)
    outfit.equip(ifHave("acc2", $item`mime army infiltration glove`));

  outfit.equip(
    mergeSpecs(
      ifHave("offhand", $item`Drunkula's wineglass`, () => myInebriety() > inebrietyLimit()),
      ifHave("offhand", $item`deft pirate hook`, () => shouldPickpocket() && fight === "regular"),
      ifHave("offhand", $item`carnivorous potted plant`)
    )
  );

  if (fight === "regular") outfit.equip(ifHave("acc3", $item`mafia thumb ring`));

  // Do we try other weapons? Saber?
  outfit.equip(ifHave("weapon", $item`June cleaver`));

  if (get("_spikolodonSpikeUses") < 5)
    outfit.tryEquip({ shirt: $item`Jurassic Parka`, modes: { parka: "spikolodon" } });

  // Also: GAP running
  if (TearawayPants.have()) {
    if (usingOrb) {
      if (CrystalBall.getPrediction().get(island.location)?.phylum === $phylum`plant`) {
        outfit.equip($item`tearaway pants`);
      }
    } else if (getMonsters(island.location).some(({ phylum }) => phylum === $phylum`plant`)) {
      outfit.equip($item`tearaway pants`);
    }
  }

  // Free run on reg fights, but only if we wouldn't waffle away from them
  if (args.freeruns && fight === "regular" && !(args.waffles && itemAmount($item`waffle`))) {
    if (!outfit.haveEquipped($item`tearaway pants`) && have($item`Greatest American Pants`))
      outfit.equip($item`Greatest American Pants`);
    else if (!outfit.equips.has($slot`acc2`))
      outfit.equip(ifHave("acc2", $item`navel ring of navel gazing`));
  }

  outfit.modifier = [`200 ${island.element} resistance 40 max`, "-100 combat -35 min", "-tie"];

  if ($familiars`Peace Turkey, Temporal Riftlet, Reagnimated Gnome` as (Familiar | undefined)[]) {
    outfit.modifier.push("1 Familiar Weight");
  } else {
    outfit.equip(ifHave("famequip", $item`tiny stillsuit`));
  }

  return outfit;
}
