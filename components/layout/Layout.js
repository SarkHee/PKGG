// /components/Layout.js
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="min-h-screen bg-white dark:bg-gray-950">{children}</main>
    </div>
  );
}
