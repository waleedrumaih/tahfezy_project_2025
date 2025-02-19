import '../styles/shared.css';
import Header from './Header';
import PageTransition from './PageTransition';
import NavigationPanel from './NavigationPanel';

const TotalPoints = () => {
  return (
    <PageTransition>
      <div className="page-container">
        <NavigationPanel />
        <div className="container">
          <Header title="مجموع النقاط" />
          {/* ... rest of your component ... */}
        </div>
      </div>
    </PageTransition>
  );
};

export default TotalPoints; 