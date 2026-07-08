// pages/clan-war.js — /clan-play로 통합됨 (구 클랜 내전 페이지)
export async function getServerSideProps() {
  return { redirect: { destination: '/clan-play', permanent: true } };
}

export default function ClanWarRedirect() {
  return null;
}
