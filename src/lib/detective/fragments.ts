export const DETECTIVE_FRAGMENTS = [
  { id: 1, type: 'text_message', source: 'Phil\'s phone', content: 'Phil texted at 11:47pm: "We\'re at Caesar\'s. Doug\'s with us. Everything\'s fine."' },
  { id: 2, type: 'voicemail', source: 'Stu\'s voicemail', content: 'Stu\'s voicemail, 2:13am: "I don\'t know where we are. Phil has a tiger. Doug— I can\'t find Doug."' },
  { id: 3, type: 'receipt', source: 'Xolotl Pet Transport', content: 'Receipt: Xolotl Pet Transport, $800 cash, signed "A. Garner", 1:50am, Caesar\'s Palace loading dock.' },
  { id: 4, type: 'security_log', source: 'Hotel Security', content: 'Hotel security log: Unusual animal sounds reported, 36th floor, 2:20am.' },
  { id: 5, type: 'cctv_transcript', source: 'Elevator CCTV', content: 'Elevator CCTV transcript: Four men and a large feline, going UP, 2:08am.' },
  { id: 6, type: 'maintenance_note', source: 'Hotel Maintenance', content: 'Hotel maintenance note: Roof access door propped open, discovered 2:55am.' },
  { id: 7, type: 'notebook', source: 'Alan\'s notebook', content: 'Alan\'s notebook: "Tiger = friend. Doug = sleeping? Left him somewhere safe. 3 stars."' },
  { id: 8, type: 'invoice', source: 'Caesar\'s Palace', content: 'Caesar\'s Palace invoice: Presidential Suite, $4,200, checked in by D. Billings, one night.' },
  { id: 9, type: 'text_message', source: 'Tracy\'s phone', content: 'Text from Tracy, 7:44am: "WHERE IS DOUG. Wedding in 6 hours. CALL ME."' },
  { id: 10, type: 'credit_card', source: 'Phil\'s statement', content: 'Phil\'s credit card: $178 charge, Caesar\'s Palace Room Service, 2:31am, Suite 3200.' },
  { id: 11, type: 'security_note', source: 'Night Security Guard', content: 'Security guard notes: "Found man on rooftop, disoriented, no shoes. Refused to give name. Gave him blanket."' },
  { id: 12, type: 'journal', source: 'Stu\'s journal', content: 'Stu\'s journal: "Went to roof for air at 2am. Someone was already there, asleep. Didn\'t want to wake him."' },
  { id: 13, type: 'cctv_log', source: 'Casino CCTV', content: 'Casino CCTV log: Doug Billings last seen at blackjack table 4, 11:33pm. Not seen after.' },
  { id: 14, type: 'text_message', source: 'Phil\'s phone', content: 'Phil\'s text at 3:17am: "tiger is contained. stu found a mattress. where the hell is doug?"' },
  { id: 15, type: 'maintenance_log', source: 'Roof Maintenance', content: 'Hotel roof maintenance log, 8:00am: "Guest found on rooftop, suite 3200 key in pocket. Escorted to room."' },
];

// The ingest API's IngestSource shape ({type, content, source}) — pre-mapped
// here so the landing page can hand this straight to handleIngest() as the
// one-click "try the demo case" seed data.
export const DETECTIVE_DEMO_SOURCES = DETECTIVE_FRAGMENTS.map((f) => ({
  type: "text" as const,
  content: f.content,
  source: f.source,
}));

export const DETECTIVE_EXTRACTION_PROMPT = `
Extract entities specific to a Las Vegas hotel investigation. Focus on:
- PEOPLE: Phil Wenneck, Stu Price, Alan Garner, Doug Billings, Tracy, hotel staff
- PLACES: rooms (Suite 3200), casino floor, rooftop, loading dock, elevator  
- EVENTS: movements, discoveries, transactions, communications
- OBJECTS: tiger, receipt, hotel key, credit card, phone
- TIME MARKERS: timestamps are critical — treat each timestamp as an Event entity
Pay special attention to WHERE people were FOUND and at WHAT TIME.
The key chain to find: who was last with Doug → where they went → where Doug ended up.
`;

export const DETECTIVE_SYSTEM_PROMPT = `
You are a hungover detective reconstructing what happened in Las Vegas last night.
Answer in first person, terse, slightly confused but getting there.
Start with "Based on the evidence on this board..."
Cite which fragments you connected. End with the key insight.
If asked where Doug is: trace the evidence chain, don't just answer — show the reasoning.

You MUST commit to a conclusion. The evidence never states the answer directly —
that's the whole point, it's scattered across fragments that only add up when
connected. If two fragments place the same person/object in the same place at
overlapping times (e.g. someone last seen with an object, then that object or an
unnamed/undescribed person turns up somewhere later), that IS your answer — state
it plainly as your conclusion, don't hedge with "his location is unknown" or
"there is no direct information." A detective who won't commit to the one
conclusion the clues obviously point to is a bad detective. Only say the trail is
cold if the fragments genuinely share no connecting entity, time, or place at all.
`;
