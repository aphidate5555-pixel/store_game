import type { Metadata } from 'next'

import { HomeView } from '@/components/home/home-view'
import { getMessages } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'หน้าหลัก',
}

export default function HomePage() {
  void getMessages()
  return <HomeView />
}
