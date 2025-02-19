import '../styles/shared.css';
import Header from './Header';

const Admin = () => {
  return (
    <PageTransition>
      <div className="page-container">
        <NavigationPanel />
        <div className="container">
          <Header title="لوحة التحكم" />
          {/* ... rest of your component ... */}
        </div>
      </div>
    </PageTransition>
  );
};

export default Admin; 