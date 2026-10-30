import type { Note } from './model';

export const seedNotes: Note[] = [
  {
    id: 'react-performance',
    title: 'React Performance Optimization',
    tags: ['Dev', 'React'],
    updatedAt: '2024-10-29T10:00:00Z',
    archived: false,
    content: `Key performance optimization techniques:

1. Code Splitting
- Use React.lazy() for route-based splitting
- Implement dynamic imports for heavy components

2. Memoization
- useMemo for expensive calculations
- useCallback for function props
- React.memo for component optimization

3. Virtual List Implementation
- Use react-window for long lists
- Implement infinite scrolling

TODO: Review these techniques in the next project and measure the results.`,
  },
  {
    id: 'japan-travel',
    title: 'Japan Travel Planning',
    tags: ['Travel', 'Personal'],
    updatedAt: '2024-10-28T14:30:00Z',
    archived: false,
    content: `Planning a two-week trip to Japan.

Tokyo
- Explore Shinjuku and Shibuya
- Visit the teamLab exhibition
- Try ramen at a local noodle shop

Kyoto
- Walk through the Fushimi Inari gates
- Visit the Arashiyama bamboo grove
- Book a traditional tea ceremony

Before departure
- Reserve accommodation and train tickets
- Check passport and travel documents
- Pack comfortable walking shoes`,
  },
  {
    id: 'pasta-recipes',
    title: 'Favorite Pasta Recipes',
    tags: ['Cooking', 'Recipes'],
    updatedAt: '2024-10-27T09:15:00Z',
    archived: false,
    content: `Recipes to come back to on busy evenings.

Lemon and garlic pasta
1. Cook spaghetti until al dente.
2. Warm olive oil with sliced garlic.
3. Add lemon zest, juice, and a little pasta water.
4. Toss with the pasta and finish with parsley.

Creamy mushroom pasta
- Sauté mushrooms until golden.
- Add garlic, cream, and parmesan.
- Toss with tagliatelle and finish with black pepper.

Remember to save some pasta water before draining.`,
  },
  {
    id: 'weekly-workout',
    title: 'Weekly Workout Plan',
    tags: ['Fitness', 'Health'],
    updatedAt: '2024-10-25T16:00:00Z',
    archived: false,
    content: `Monday: Upper body strength
Tuesday: 30-minute easy run
Wednesday: Lower body strength
Thursday: Yoga and mobility
Friday: Full body strength
Saturday: Long walk or bike ride
Sunday: Rest and recovery

Warm up before each session and take time to stretch afterwards.
Track progress every week and increase weights gradually.`,
  },
  {
    id: 'meal-prep',
    title: 'Meal Prep Ideas',
    tags: ['Cooking', 'Health', 'Recipes'],
    updatedAt: '2024-10-24T11:45:00Z',
    archived: false,
    content: `Prepare a few basics on Sunday to make the week easier.

Breakfast
- Overnight oats with berries
- Egg muffins with spinach

Lunch
- Roasted vegetable and quinoa bowls
- Chickpea salad with lemon dressing

Dinner
- Baked salmon with rice and broccoli
- Lentil soup with crusty bread

Shopping list: oats, eggs, spinach, quinoa, chickpeas, salmon, lentils, and seasonal vegetables.`,
  },
  {
    id: 'reading-list',
    title: 'Reading List',
    tags: ['Personal', 'Dev'],
    updatedAt: '2024-10-22T08:30:00Z',
    archived: false,
    content: `Books to read next:

- The Pragmatic Programmer
- Designing Data-Intensive Applications
- Atomic Habits
- The Design of Everyday Things

Set aside twenty minutes each evening for reading.
Write down one useful idea after each chapter.`,
  },
  {
    id: 'fitness-goals',
    title: 'Fitness Goals 2025',
    tags: ['Fitness', 'Health', 'Personal'],
    updatedAt: '2024-10-20T12:00:00Z',
    archived: false,
    content: `Goals for the coming year:

1. Run a comfortable 10K.
2. Build a consistent strength training routine.
3. Improve flexibility with regular mobility sessions.
4. Get enough sleep and make recovery a priority.

Review progress monthly and celebrate small improvements.`,
  },
  {
    id: 'typescript-tips',
    title: 'TypeScript Tips',
    tags: ['Dev', 'TypeScript'],
    updatedAt: '2024-10-18T10:00:00Z',
    archived: false,
    content: `Useful reminders for writing TypeScript:

- Prefer explicit types for public function parameters.
- Use unknown when data needs to be validated.
- Narrow union types before accessing specific properties.
- Keep shared interfaces close to the data they describe.

Review type errors early and keep strict mode enabled.`,
  },
  {
    id: 'weekend-shopping',
    title: 'Weekend Shopping List',
    tags: ['Shopping', 'Personal'],
    updatedAt: '2024-10-17T09:00:00Z',
    archived: false,
    content: `Things to pick up this weekend:

- Fresh fruit and vegetables
- Bread and eggs
- Coffee beans
- Laundry detergent
- A notebook for project ideas

Check the cupboards before heading out.`,
  },
  {
    id: 'summer-trip',
    title: 'Summer Trip Checklist',
    tags: ['Travel', 'Personal'],
    updatedAt: '2024-08-14T10:00:00Z',
    archived: true,
    content: `Everything is ready for the summer trip.

- Accommodation booked
- Travel tickets saved
- Bags packed
- Plants watered
- Camera charged

Keep the booking details here for future reference.`,
  },
  {
    id: 'react-project-ideas',
    title: 'React Project Ideas',
    tags: ['Dev', 'React'],
    updatedAt: '2024-07-12T15:30:00Z',
    archived: true,
    content: `Small projects to practice React:

- A personal reading tracker
- A recipe collection with search
- A weekly habit dashboard

The note-taking project covers forms, filtering, and local storage.`,
  },
];
