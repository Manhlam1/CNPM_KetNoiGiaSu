import { Button } from '../../components/ui';

export function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="max-w-2xl text-4xl font-bold">Tìm gia sư, học xong mới trả tiền cho gia sư</h1>
      <Button to="/tutors" size="lg" className="mt-6">
        Tìm gia sư
      </Button>
    </section>
  );
}
