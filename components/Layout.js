// /components/Layout.js
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
