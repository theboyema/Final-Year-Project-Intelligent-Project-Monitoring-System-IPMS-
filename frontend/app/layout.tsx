import './globals.css';
import Providers from '../components/providers';

export const metadata = {
  title: 'IPMS',
  description: 'Intelligent Project Monitoring System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Anti-flash: apply saved theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('ipms_theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
