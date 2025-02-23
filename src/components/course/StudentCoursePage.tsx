@@ .. @@
 import MaterialList from '../../components/course/MaterialList';
 import AssignmentList from '../../components/course/AssignmentList';
 import AnnouncementList from '../../components/course/AnnouncementList';
+import AssignmentHistory from '../../components/course/AssignmentHistory';
 import CourseAIChat from '../../components/course/CourseAIChat';
 import { useAuth } from '../../contexts/AuthContext';
 import { supabase } from '../../lib/supabase';
@@ .. @@
             </div>
 
             <div className="bg-white rounded-xl shadow-sm p-6">
+              <div className="flex items-center justify-between mb-6">
+                <h2 className="text-xl font-semibold">Assignment History</h2>
+              </div>
+              <AssignmentHistory courseId={courseId} />
+            </div>
+
+            <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
               <CourseAIChat courseId={courseId} />
             </div>
           </div>