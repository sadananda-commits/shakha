import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import FlameDivider from '@/components/FlameDivider';
import ActivityCard from '@/components/ActivityCard';
import { callHssApi } from '@/lib/hssApi';
import { Activity } from '@/lib/types';

// Shown while the API isn't wired up yet, or if it fails — keeps the
// page usable during early development. Replace by setting
// NEXT_PUBLIC_HSS_API_URL once the Apps Script backend is deployed.
const FALLBACK_ACTIVITIES: Activity[] = [
  { 'Activity ID': 'ACT001', 'Activity Name': 'Khel', Description: 'Traditional games building teamwork and agility', Category: 'Physical', 'Image/Thumbnail URL': '', 'Repository Link': '', 'Display Order': 1, 'Active Status': 'Active' },
  { 'Activity ID': 'ACT002', 'Activity Name': 'Baudhik', Description: 'Value-based discussions and storytelling sessions', Category: 'Intellectual', 'Image/Thumbnail URL': '', 'Repository Link': '', 'Display Order': 2, 'Active Status': 'Active' },
  { 'Activity ID': 'ACT003', 'Activity Name': 'Yoga', Description: 'Group yoga and stretching for all ages', Category: 'Physical', 'Image/Thumbnail URL': '', 'Repository Link': '', 'Display Order': 3, 'Active Status': 'Active' },
  { 'Activity ID': 'ACT004', 'Activity Name': 'Geet', Description: 'Community singing of patriotic and devotional songs', Category: 'Cultural', 'Image/Thumbnail URL': '', 'Repository Link': '', 'Display Order': 4, 'Active Status': 'Active' },
];

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>(FALLBACK_ACTIVITIES);

  useEffect(() => {
    callHssApi<Activity[]>('getActivities')
      .then((data) => data.length && setActivities(data))
      .catch(() => {
        /* keep fallback activities */
      });
  }, []);

  return (
    <Layout>
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-marigold-dark mb-4">
          Hindu Swayamsevak Sangh
        </p>
        <h1 className="text-4xl sm:text-5xl font-display font-semibold text-ink max-w-2xl mx-auto leading-tight">
          Our Shakha, Our Extended Family, Across Denmark.
        </h1>
        <p className="mt-4 text-ink-light max-w-lg mx-auto">
          Find your Shakha, confirm attendance for your family in seconds, and explore
          the activities that bring the community together.
        </p>
        <div className="flex justify-center my-8">
          <FlameDivider />
        </div>
        <div className="flex justify-center">
          <Link
            href="/my-shakha"
            className="px-6 py-3 rounded-card bg-ink text-paper font-medium"
          >
            My Shakha
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-display font-semibold text-ink mb-6">
          What happens at Shakha
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activities.map((a) => (
            <ActivityCard key={a['Activity ID']} activity={a} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
