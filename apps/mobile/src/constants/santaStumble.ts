export type SantaBar = {
  name: string;
  restaurantId?: string;
  note?: string;
};

export type SantaPickup = {
  day: string;
  time: string;
  location: string;
  restaurantId?: string;
};

export const santaStumble = {
  id: 'santa-stumble',
  name: "Santa's Stumble",
  dateLabel: 'Saturday, December 13',
  timeLabel: '4:00-10:00 pm',
  ticketUrl: 'https://tickets.venuepilot.com/e/lancaster-santa-stumble-2025-12-13-lancaster-santa-stumble-lancaster-9ba591',
  description:
    "Donate $10 or more to get the official button (worth $0.25) that proves you're in. Dress as Santa, an elf, snowman, or anything festive and bar-hop downtown Lancaster on your own schedule.",
  charities: [
    'Acorn Acres Wildlife Rehabilitation',
    'Precious Paws Community Cats',
    'Feathered Sanctuary Exotic Bird Rescue',
    'The Arc Lancaster Lebanon',
  ],
  costumeNote: 'Costume contest at The Village at 8:00. Be there by 7:30 to enter.',
  ageRestriction: 'This event is 21+.',
  pickupWindowNote: 'Button pick-up events (5:30-7:30 each night):',
  pickupEvents: [
    {
      day: 'Wed Dec 3',
      time: '5:30-7:30',
      location: 'Marion Court Room',
      restaurantId: '882d3e43-f4e5-4d67-8798-809947434365',
    },
    {
      day: 'Tues Dec 9',
      time: '5:30-7:30',
      location: "Stubby's Bar and Grille (Olde Hickory Rd)",
      restaurantId: 'b219b59a-5dbe-4ca0-a44a-941653b6d548',
    },
    {
      day: 'Thurs Dec 11',
      time: '5:30-7:30',
      location: 'Tellus 360',
      restaurantId: '24ca0f49-d7d8-4b08-9fbc-7a0c9df320e4',
    },
  ] satisfies SantaPickup[],
  extraPickupNote:
    "Cash-only buttons (no online sales pickup) during business hours at Woof 'N Tails and Acorn Acres Wildlife Rehabilitation.",
  schedule: [
    '4:00-7:00 Pick up your buttons at Penn Square (by the huge Christmas tree) if you did not already get them',
    '7:30 Costume contest participants should be at The Village',
    '8:00 Costume contest begins at The Village',
    '4:00-??? Bar hop until you are partied out',
  ],
  // Flyer-inspired palette (cool blue tones from the event art)
  theme: {
    primary: '#0F2C4C',
    secondary: '#0A1E36',
    accent: '#2D9CDB', // deeper blue for readability
    badge: '#B8E4FF',
    cta: '#F4B400', // warmer gold with better contrast
    textOnCta: '#1A1A1A',
    textOnAccent: '#0A1E36',
  },
  participatingBars: [
    { name: 'Tellus 360', restaurantId: '24ca0f49-d7d8-4b08-9fbc-7a0c9df320e4' },
    { name: "Annie Bailey's", restaurantId: '89983be6-0ce8-4f4f-91ee-65d283b99995' },
    { name: 'Decades', restaurantId: '70d1ff08-d9ba-4de0-bc39-f416ead46902' },
    { name: "Dan's Pub", restaurantId: 'a68058b0-e8d1-4153-93d8-ae45f31a8b44' },
    { name: 'Lancaster Sports Bar', restaurantId: '65dbc5f4-3019-4c1c-83df-d2a261d81731' },
    { name: 'The Corner at Musser', restaurantId: '16021902-fe12-4f21-8fd7-e888fb018254' },
    { name: 'Queen Street Bistro', restaurantId: '048a9211-1305-42c0-83e6-01eb053fd267' },
    {
      name: 'The Village',
      restaurantId: '5ecc2a8b-edce-4986-a438-71f0f2ad140c',
      note: 'Costume contest host',
    },
    {
      name: "Stubby's (Downtown)",
      restaurantId: 'f4b99ffc-daa7-48aa-85a8-5585a6bba1b9',
    },
    {
      name: "Stubby's (Old Hickory)",
      restaurantId: 'b219b59a-5dbe-4ca0-a44a-941653b6d548',
    },
    { name: 'Yorgos', restaurantId: '7bfdf539-8fe3-4cc3-a3b0-2548c91771c9' },
    { name: 'Bert and the Elephant', restaurantId: '664bdda5-b6c1-41de-bf6c-81123e543994' },
    { name: 'Marion Court Room', restaurantId: '882d3e43-f4e5-4d67-8798-809947434365' },
    { name: 'The Fridge', restaurantId: '9570c755-329c-4a5e-b628-670bc65045bc' },
    { name: 'Southern Market', restaurantId: 'f3167bfc-9313-477b-a1ae-c6ef52de7d32' },
    { name: 'Our Town Brewery', restaurantId: 'd54a6a65-4195-4ee3-a43b-e3d401c0268f' },
    { name: 'House of Pizza', restaurantId: '171e1717-8a7a-4504-8b24-8278479ebc7b' },
    { name: 'West Art', restaurantId: 'ded6ed43-0163-41d3-a8cf-c122f951c22a' },
    { name: 'Rural City Taproom', restaurantId: 'c73f4e2a-d171-4b44-b7f3-eea883985ca5' },
    { name: "Hildy's Tavern", restaurantId: 'd3e57583-3ef4-4e24-8ed5-5acd76863c3e' },
    { name: 'ABAG (American Bar & Grill)', restaurantId: '372bf635-5eb8-4a92-9548-29809d0c1ffc' },
    { name: 'Meduseld Meadery', restaurantId: '690dfe27-6574-49f2-9adf-5f08205e8b47' },
    { name: 'South County Brewing Co', restaurantId: '2aece30e-2e97-4ef5-bb97-2dfbec7c2488' },
    { name: 'Shot and Bottle', restaurantId: 'd105a683-1edd-4024-8999-9f3b85474152' },
    { name: 'Casa Blanca Event Space' },
    { name: 'Columbia Kettle Works 2nd Gear', restaurantId: 'f1a8ca30-b60c-44e3-b0f4-0f6ab782293d' },
    { name: 'Altana Rooftop Lounge', restaurantId: '5e831012-2eda-48c6-95c1-15fb6daf9d18' },
    { name: '551 West', restaurantId: 'a5d4ff4b-1fa7-42b7-9a9a-df589e4ce39b' },
    { name: "Rumplebrewskin's", restaurantId: '340fefbf-ef3e-4338-99a2-6b693deba244' },
  ] satisfies SantaBar[],
};
