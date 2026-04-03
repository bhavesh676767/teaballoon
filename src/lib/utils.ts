import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CUTE_NAMES = [
  "sleepy mango", "pink echo", "tiny comet", "soft peach", "blue feather",
  "fuzzy cloud", "little marshmallow", "dreamy wave", "shy ghost",
  "happy raindrop", "whispering breeze", "golden spark", "gentle moon",
  "sunny petal", "paper moon", "minty breeze", "lavender fox", "coral spark",
]

export function getRandomName() {
  return CUTE_NAMES[Math.floor(Math.random() * CUTE_NAMES.length)]
}

export function getDeviceId() {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("tb_device_id");
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("tb_device_id", id);
  }
  return id;
}
