export interface Post {
  id: string;
  title: string;
  body: string;
  team: string;
  date: string;
}

export interface Task {
  id: string;
  text: string;
  who: string;
  done: boolean;
}
