import Header from './components/Header';
import Hero from './components/Hero';
import ProblemsSection from './components/ProblemsSection';
import FeaturesSection from './components/FeaturesSection';
import ToolsSection from './components/ToolsSection';
import ArchitectureSection from './components/ArchitectureSection';
import MemorySection from './components/MemorySection';
import AudienceSection from './components/AudienceSection';
import StackSection from './components/StackSection';
import ComparisonSection from './components/ComparisonSection';
import QuickStart from './components/QuickStart';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProblemsSection />
        <FeaturesSection />
        <ToolsSection />
        <ArchitectureSection />
        <MemorySection />
        <AudienceSection />
        <StackSection />
        <ComparisonSection />
        <QuickStart />
      </main>
      <Footer />
    </>
  );
}

export default App;
