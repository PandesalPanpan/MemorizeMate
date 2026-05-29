import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundScreen() {
  return (
    <section>
      <h2>Page not found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/"><Button>Go home</Button></Link>
    </section>
  );
}
