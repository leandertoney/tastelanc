import { redirect } from 'next/navigation';
import { BRAND } from '@/config/market';

export default function RegisterPage() {
  if (BRAND.appStoreUrls.ios) {
    redirect(BRAND.appStoreUrls.ios);
  }
  redirect('/');
}
