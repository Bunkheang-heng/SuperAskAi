# BRD process flow figures

| File | Figure |
|---|---|
| `as-is-process-flow.svg` | §2.1.1 Current Process (As-Is) |
| `askgov-tobe-process-flow.svg` | §2.1.2 Future Process (To-Be) — 3720 × 2847 |
| `askgov-tobe-process-flow@2x.png` | 7440 × 5694 raster of the To-Be figure, for Word / Google Docs |
| `askgov-tobe-process-flow@check.png` | low-res copy, for eyeballing the layout |

## The To-Be figure

Four horizontal swimlanes — **Citizen · AskGov Answer Engine · DG Support Officer ·
Content & Institutional Stewardship** — with a left-to-right primary flow.

Notation:

- rounded rectangles for process steps
- diamonds for governed decisions
- pill terminators for start and end points
- dashed-border boxes for annotations
- solid arrows for the primary flow, dashed for feedback and secondary links
- circled letters for off-page connectors, where a link would otherwise cross the page
- **line hops** (small arcs) wherever two paths cross, so a crossing never reads as a join

Colour is used only to separate path types: navy for the primary flow, red for refusal
and suppression, green for approved content, purple for the human officer path, grey for
paths that terminate without an officer.

## Regenerating

    node build-tobe-flow.js          # rewrites askgov-tobe-process-flow.svg

All content, layout and connector routing lives in `build-tobe-flow.js`. Edit the arrays
in the `ROWS` object to change wording — that is normally the only thing you need to touch.

**Nothing is positioned vertically by hand.** Every shape is measured from its own text:
each box's height comes from its wrapped copy, each diamond is sized so its question clears
the sloping edges, a row's height is the tallest shape in it, and text is vertically
centred. The "geometry" pass then stacks rows → lanes → channels → canvas height from those
measurements, so the whole figure re-flows when the copy changes. Columns stay on a fixed
420 px pitch, and every arrow is expressed against cell anchors (`L`/`Rr`/`T`/`B`/`Bx`).

Type sizes live in one block near the top (`T_S`, `D_S`, `N_S`, `M_S`, `K_S` and their line
heights). Raising them makes boxes taller and the canvas longer — that is the intended
behaviour, not a bug.

The script prints each row's computed `y` and height, which is the quickest way to see what
a copy change did.

### Where the routing channels are

Long connectors run in named horizontal channels (`CH_TOP`, `CH_WRAP`, `CH_BUS`, `CH_CZ`)
and in the gutters between columns. When a vertical crosses one of those channels, add its
x to that arrow's `hops` array so the horizontal arcs over it.

## Re-exporting the PNGs

    node server.js                                    # serves this folder on :8812
    # open http://localhost:8812/render.html — it rasterises the SVG at 2x and at
    # 0.55x and POSTs both back, overwriting the two PNGs above.

`crops.html` does the same for magnified crops of individual regions — edit the `CROPS`
array to pick the area, then open http://localhost:8812/crops.html. Useful for checking
label collisions before export. Delete the `crop-*.png` files afterwards.

## Putting it in Figma

Drag `askgov-tobe-process-flow.svg` onto the Figma canvas. It imports as editable layers
(frames, text, vectors) rather than a flat image.

Arrowheads are drawn as filled paths rather than SVG `<marker>` elements, because Figma's
importer discards markers — using markers would leave every connector headless on import.
Keep it that way if you edit the generator.

## Putting it in Word

Insert `askgov-tobe-process-flow@2x.png`. At 7440 px wide it holds up on a landscape page
and in print. For a vector placement, print the SVG to PDF from a browser first — Word's
own SVG import handles this file inconsistently.

---

`build-tobe-flow.v1.js` is the previous generator, kept only as a fallback. Safe to delete
once the current figure is signed off.
