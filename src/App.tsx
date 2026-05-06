/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import SpriteGenerator from "./components/SpriteGenerator";

export default function App() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans antialiased text-gray-900 selection:bg-amber-200">
      <SpriteGenerator />
      
      {/* Decorative background element */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: `radial-gradient(#000 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
    </div>
  );
}
