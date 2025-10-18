// /components/Layout.js
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-20 min-h-screen bg-white">
        {children}
      </main>
      <Footer />
    </div>
  );
}
