import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import AssetInventory from './pages/AssetInventory';
import AssetDiscovery from './pages/AssetDiscovery';
import Cbom from './pages/Cbom';
import PqcPosture from './pages/PqcPosture';
import CyberRating from './pages/CyberRating';
import Reporting from './pages/Reporting';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="inventory" element={<AssetInventory />} />
          <Route path="discovery" element={<AssetDiscovery />} />
          <Route path="cbom" element={<Cbom />} />
          <Route path="pqc-posture" element={<PqcPosture />} />
          <Route path="rating" element={<CyberRating />} />
          <Route path="reporting" element={<Reporting />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
