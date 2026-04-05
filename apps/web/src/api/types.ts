export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type SpaceListItem = {
  id: string;
  name: string;
  ownerId: string;
  role: string;
  createdAt: string;
  joinedAt: string;
};

export type SpaceDetail = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  inviteToken?: string;
};

export type Member = {
  memberId: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
};

export type BalanceRow = {
  userId: string;
  email: string;
  balance: string;
};

export type SettlementRow = {
  fromUserId: string;
  toUserId: string;
  fromEmail: string | null;
  toEmail: string | null;
  amount: string;
};

export type ExpenseSplit = {
  id: string;
  userId: string;
  mode: string;
  weight: string | null;
};

export type Expense = {
  id: string;
  spaceId: string;
  amount: string;
  payerId: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  payer: { id: string; email: string };
  splits: ExpenseSplit[];
};
