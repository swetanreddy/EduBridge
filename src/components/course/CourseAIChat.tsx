import React, { useState, useEffect } from 'react';
import { Send, Loader2, BookOpen, Brain, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateCourseAnswer } from '../../lib/openai';

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  material_references: {
    id: string;
    title: string;
    content: string;
  }[];
}

interface CourseAIChatProps {
  courseId: string;
}

export default function CourseAIChat({ courseId }: CourseAIChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, [courseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('course_chats')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const userQuestion = question.trim();
    setQuestion('');
    setLoading(true);

    try {
      // Get course materials
      const { data: materials } = await supabase
        .from('course_materials')
        .select('id, title, content, content_type, file_url')
        .eq('course_id', courseId);

      if (!materials) throw new Error('No course materials found');

      // Generate AI response
      const response = await generateCourseAnswer({ question: userQuestion, courseId });

      // Save chat message
      const { data: chatMessage, error } = await supabase
        .from('course_chats')
        .insert({
          course_id: courseId,
          student_id: user?.id,
          question: userQuestion,
          answer: response.answer,
          material_references: response.references
        })
        .select()
        .single();

      if (error) throw error;
      setMessages([...messages, chatMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear all chat messages? This cannot be undone.')) return;
    
    setClearing(true);
    try {
      const { error } = await supabase
        .from('course_chats')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', user?.id);

      if (error) throw error;
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-600" />
          <h2 className="text-lg font-semibold">Course AI Assistant</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            disabled={clearing}
            className="flex items-center gap-2 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Clear Chat
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Ask me anything about the course materials!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="bg-indigo-50 rounded-lg p-3 inline-block">
                    {message.question}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="whitespace-pre-wrap">{message.answer}</p>
                    {message.material_references?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-purple-100">
                        <p className="text-sm text-purple-700 font-medium">References:</p>
                        <ul className="mt-1 space-y-1">
                          {message.material_references.map((ref) => (
                            <li key={ref.id} className="text-sm text-purple-600">
                              {ref.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the course materials..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}