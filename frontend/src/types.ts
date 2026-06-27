// 백엔드 응답 형태 (App과 TransactionForm이 공유)
export type Category = { id: number; name: string; type: string; parent_id: number | null; color: string | null };
export type PaymentMethod = { id: number; name: string };
export type Tag = { id: number; name: string };
export type Transaction = {
  id: number;
  date: string;
  type: "income" | "expense";
  amount: string;
  category_id: number | null;
  payment_method_id: number | null;
  raw_merchant: string | null;
  alias: string | null;
  memo: string | null;
  source: string;
  tags: string[];
};
