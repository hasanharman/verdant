// Everything a human might want to change lives here: name, contact, copy.
export const site = {
  name: "Verdant",
  tagline: "Glass greenhouses",
  system: "VG-4",
  city: "Your City",
  phone: "+00 000 000 00 00",
  email: "hello@example.com",
  address: "Workshop · Industrial Zone, Your City",
  hours: "Mon–Sat · 08:30–18:30",
  year: 2026,
  repo: "https://github.com/hasanharman/greenhouse",
}

export const nav = [
  { href: "#top", label: "Structure" },
  { href: "#process", label: "Process" },
  { href: "#configure", label: "Configure" },
  { href: "#faq", label: "FAQ" },
]

export const process = [
  {
    no: "01",
    title: "Survey",
    body: "We walk the plot with you, check sun, slope and drainage, and size the house to your crop and space.",
    note: "Site visit",
  },
  {
    no: "02",
    title: "Foundation",
    body: "A concrete strip footing, poured level, so the frame stays square through every season.",
    note: "Level to the mm",
  },
  {
    no: "03",
    title: "Frame",
    body: "Powder-coated aluminium gable frames are bolted together on site, one bay at a time.",
    note: "Bolted, not welded",
  },
  {
    no: "04",
    title: "Glaze",
    body: "Panes go in with gaskets and clips, then the vents, gutters and door are fitted and adjusted.",
    note: "Weather-sealed",
  },
] as const

export const reasons = [
  {
    title: "Sized to your plot",
    body: "Any length, one bay at a time. We fit the house to the space you have, not the other way round.",
  },
  {
    title: "Glazing for your crop",
    body: "Clear glass for fruiting crops, diffuse glass or polycarbonate for leafy greens and seedlings. We'll help you choose.",
  },
  {
    title: "One team, start to finish",
    body: "Survey, foundation, frame and glazing are all done by the same people, so nothing gets lost between trades.",
  },
  {
    title: "Help through the seasons",
    body: "A vent opener to adjust, a pane to replace, a bay to add later. We're nearby when you need us.",
  },
] as const

export const faqs = [
  {
    q: "Glass or polycarbonate?",
    a: "Glass lets in the most light and lasts the longest. Twin-wall polycarbonate is lighter, insulates better and diffuses light, which leafy crops and seedlings like. We'll recommend one for what you grow.",
  },
  {
    q: "Do I really need a foundation?",
    a: "For a glass house, yes. A level strip footing keeps the frame square, so doors slide and panes stay sealed. It's also what holds the house down in strong wind.",
  },
  {
    q: "How does it stay ventilated?",
    a: "The roof vents have automatic openers that lift as the temperature rises and close as it cools, with no electricity. The sliding door adds a through-draught on hot days.",
  },
  {
    q: "Can you add irrigation, heating or lighting?",
    a: "Drip irrigation along the beds is part of our standard layout. We can plan for heating, shading and grow lights and leave the right connections in place.",
  },
  {
    q: "Do I need permission to build one?",
    a: "Rules depend on the size of the house and where you are. We'll tell you what's usually needed and give you drawings to submit if you need them.",
  },
] as const
