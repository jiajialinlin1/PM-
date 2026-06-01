import { createFeature, createFeedback, resetDemoData } from './db.js';

resetDemoData();

createFeature({
  title: 'Define the first product workflow',
  description: 'Map the main user journey and capture the first version of success metrics.',
  priority: 'high'
});

createFeature({
  title: 'Create a feedback intake board',
  description: 'Collect user comments and classify repeated needs before building deeper features.',
  priority: 'medium'
});

createFeature({
  title: 'Prepare the first admin dashboard',
  description: 'Show product health, feature status, and customer signals in one place.',
  priority: 'medium'
});

createFeedback({
  author: 'Demo user',
  message: 'I want a simple way to see what the team is building next.',
  source: 'interview'
});

console.log('Seed data created.');
