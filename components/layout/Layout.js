// /components/Layout.js
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="crate-dark min-h-screen">
      <Header />
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
