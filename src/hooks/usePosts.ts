import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Comment {
  id: string;
  userName: string;
  userRole: 'Student' | 'Alumni' | 'Guest';
  text: string;
  timestamp: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorRole: 'Student' | 'Alumni' | 'Guest';
  authorPhoto?: string;
  category: 'General' | 'Departments' | 'Hostels' | 'Clubs' | 'Placement' | 'Sports' | 'Alumni';
  title: string;
  content: string;
  imageUrl?: string;
  claps: number;
  commentsCount: number;
  comments: Comment[];
  timestamp: string;
  isClapped?: boolean;
  isEdited?: boolean;
  editedAt?: string;
  isHidden?: boolean;
  commentsDisabled?: boolean;
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    authorName: 'Prof. S. K. Choudhary',
    authorRole: 'Alumni',
    authorPhoto: 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix',
    category: 'Placement',
    title: 'Wipro Campus Drive Selection 2026!',
    content: 'Heartiest congratulations to the 12 students from the Computer Science and Electrical Engineering departments on getting placed during yesterday\'s Wipro campus drive! Keep the MCE flag flying high!',
    imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=80',
    claps: 142,
    commentsCount: 2,
    timestamp: '2 hours ago',
    comments: [
      {
        id: 'c-1',
        userName: 'Aman Kumar',
        userRole: 'Student',
        text: 'Super proud of my seniors! Congratulations everyone! 🎉',
        timestamp: '1 hour ago',
      },
      {
        id: 'c-2',
        userName: 'Rakesh Ranjan',
        userRole: 'Alumni',
        text: 'Great to see campus placements scaling up. All the best to the placed batch.',
        timestamp: '45 mins ago',
      }
    ],
  },
  {
    id: 'post-2',
    authorName: 'Neha Kumari (CS Student)',
    authorRole: 'Student',
    authorPhoto: 'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka',
    category: 'Clubs',
    title: 'CodeQuest Hackathon registration is now Live!',
    content: 'MCE Tech Club presents CodeQuest 2026. A 24-hour non-stop hackathon to solve local municipal and college challenges. Cash prizes up to ₹25,000! Tap below to register your team.',
    imageUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    claps: 98,
    commentsCount: 1,
    timestamp: '5 hours ago',
    comments: [
      {
        id: 'c-3',
        userName: 'Vikram Singh',
        userRole: 'Student',
        text: 'Count me in! Looking for a designer teammate.',
        timestamp: '4 hours ago',
      }
    ],
  },
  {
    id: 'post-3',
    authorName: 'Ravi Verma (Hostel Representative)',
    authorRole: 'Student',
    authorPhoto: 'https://api.dicebear.com/7.x/avataaars/png?seed=Jack',
    category: 'Hostels',
    title: 'Inter-Hostel Badminton Tournament starting Saturday',
    content: 'Matches will take place in the new indoor court at Aryabhatta Hostel (Hostel 3). Registrations close tomorrow evening at 5 PM. Contact your respective hostel sports captains.',
    claps: 65,
    commentsCount: 0,
    timestamp: 'Yesterday',
    comments: [],
  }
];

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPosts() {
      try {
        const stored = await AsyncStorage.getItem('@mce_posts');
        if (stored) {
          setPosts(JSON.parse(stored));
        } else {
          await AsyncStorage.setItem('@mce_posts', JSON.stringify(INITIAL_POSTS));
          setPosts(INITIAL_POSTS);
        }
      } catch (e) {
        console.error('Failed to load posts:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadPosts();
  }, []);

  const handleClap = async (postId: string) => {
    const updated = posts.map(post => {
      if (post.id === postId) {
        const isClapped = !post.isClapped;
        return {
          ...post,
          isClapped,
          claps: isClapped ? post.claps + 1 : post.claps - 1
        };
      }
      return post;
    });

    setPosts(updated);
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
  };

  const addComment = async (postId: string, userName: string, userRole: 'Student' | 'Alumni' | 'Guest', text: string) => {
    if (!text.trim()) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userName,
      userRole,
      text,
      timestamp: 'Just now'
    };

    const updated = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          commentsCount: post.commentsCount + 1,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    });

    setPosts(updated);
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
  };

  const createPost = async (
    authorName: string,
    authorRole: 'Student' | 'Alumni' | 'Guest',
    category: Post['category'],
    title: string,
    content: string,
    imageUrl?: string
  ) => {
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorName,
      authorRole,
      authorPhoto: authorRole === 'Guest'
        ? 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix'
        : 'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka',
      category,
      title,
      content,
      imageUrl,
      claps: 0,
      commentsCount: 0,
      comments: [],
      timestamp: 'Just now',
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
  };

  const filteredPosts = selectedCategory === 'All'
    ? posts
    : posts.filter(post => post.category === selectedCategory);

  return {
    posts: filteredPosts,
    allPosts: posts,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    handleClap,
    addComment,
    createPost
  };
}
