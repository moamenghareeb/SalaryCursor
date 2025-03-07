import '../styles/globals.css';
import type { AppProps } from 'next/app';
import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { AuthProvider } from '../lib/authContext';
import Layout from '../components/Layout';

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  // Check if the page requires authentication
  const getLayout = Component.getLayout ?? ((page) => (
    <AuthProvider>
      <Layout>{page}</Layout>
    </AuthProvider>
  ));

  return getLayout(<Component {...pageProps} />);
}

export default MyApp; 