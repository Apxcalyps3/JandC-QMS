import { createContext, useContext, ReactNode } from "react";
import { useOrderState as useLocalOrderState, OrderState } from "@/lib/order-state";

interface OrderContextType {
  state: OrderState;
  updateState: (updates: Partial<OrderState>) => void;
  clearState: () => void;
}

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const orderState = useLocalOrderState();

  return (
    <OrderContext.Provider value={orderState}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}
