import React from 'react';

interface PageProps {
  children: React.ReactNode;
  title: string;
}

const Page: React.FC<PageProps> = ({ children, title }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      {children}
    </div>
  );
};

export default Page;