"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function BrandTabs({
  board,
  chat,
  guidelines,
  settings,
}: {
  board: React.ReactNode;
  chat: React.ReactNode;
  guidelines: React.ReactNode;
  settings: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="board">
      <TabsList variant="line">
        <TabsTrigger value="board">Board</TabsTrigger>
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="board">{board}</TabsContent>
      <TabsContent value="chat">{chat}</TabsContent>
      <TabsContent value="guidelines">{guidelines}</TabsContent>
      <TabsContent value="settings">{settings}</TabsContent>
    </Tabs>
  );
}
