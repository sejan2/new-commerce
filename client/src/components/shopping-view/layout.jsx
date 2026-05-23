import { Outlet } from "react-router-dom";
import ShoppingHeader from "./header";
import AIShoppingAssistant from "./AIShoppingAssistant";

function ShoppingLayout() {
  return (
    <div className="flex flex-col bg-white overflow-hidden">
      <ShoppingHeader />
      <main className="flex flex-col w-full">
        <Outlet />
      </main>
      <AIShoppingAssistant />
    </div>
  );
}

export default ShoppingLayout;