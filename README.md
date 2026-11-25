# Warung Rush

[![make.fun competition](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![make.fun rank](https://make.fun/badge/best-cooking-game-20261125-0137/eziebatozai/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![make.fun reward](https://make.fun/badge/best-cooking-game-20261125-0137/eziebatozai/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

**Warung Rush** is an original Indonesian street-food cooking game built in vanilla JavaScript, HTML5 2D Canvas, and procedural WebAudio — zero external assets, zero build step, and zero network requests.

## Gameplay

Run a bustling Jakarta/Yogyakarta evening *warung kaki lima* through a 3-minute escalating service shift (**Opening → Lunch Rush → Peak Rush → Last Call!**):

- **Order Board**: Incoming tickets for **Nasi Goreng**, **Mie Goreng**, **Sate Ayam**, **Mie Ayam**, and **Nasi Spesial** with visual ingredient checklists and color-coded patience bars.
- **Prep & Cooking**: Grab fresh ingredients from market crates (Rice, Noodles, Chicken, Veggies, Eggs), chop chicken and veggies at the center butcher-block island, cook on twin cast-iron **Woks**, the simmering **Broth Pot**, or the glowing **Charcoal Sate Grill** (pull food off before it burns!), and dress dishes with **Peanut Sauce** or **Chili Sambal**.
- **Plating & Service**: Assemble dishes on banana-leaf ceramic plates at three plating counters and deliver finished plates to the Serving Windows before patience runs out to earn **Coins**, **Fast-Serve Tips**, and **Combo Streak** multipliers.

## Controls

- **Move**: `WASD` or Arrow Keys
- **Interact / Chop**: `Space` or `E` (hold or tap repeatedly to chop faster)
- **Dash**: `Q` or `Shift`
- **Mouse**: Click any station to auto-walk around the island and interact; click the floor to move
- **Pause / Mute**: `P` / `Esc` to pause, `M` to toggle WebAudio sound

## Running Locally

```bash
node serve.ts
# Open http://localhost:8080 in Chrome
```

To build the competition output and `dossier.json`:

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](./LICENSE).
