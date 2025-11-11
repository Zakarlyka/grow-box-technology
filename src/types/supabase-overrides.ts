// src/types/supabase-overrides.ts
// Гарячий фікс для RPC-функцій, які не синхронізовані в автоматичних типах

// 1. Тип, який повертає admin_get_all_users
export type AdminUser = {
  user_id: string;
  email: string;
  app_role: string;
  full_name: string | null;
};

// 2. Визначення наших RPC-функцій
export interface RpcFunctionDefinitions {
  get_my_role: {
    Args: Record<string, never>; // Немає аргументів
    Returns: string; // Повертає 'user', 'admin' тощо.
  };
  admin_get_all_users: {
    Args: Record<string, never>; // Немає аргументів
    Returns: AdminUser[]; // Повертає масив
  };
  is_admin: {
    Args: Record<string, never>;
    Returns: boolean;
  };
  // (Ми додаємо 'has_role', щоб TypeScript не ламався на старих типах)
  has_role: {
    Args: { _user_id: string; _role: string };
    Returns: boolean;
  };
}
