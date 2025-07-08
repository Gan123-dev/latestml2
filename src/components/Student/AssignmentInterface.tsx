import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Send,
  ArrowLeft,
  X,
  Award,
  Calendar,
  FileText,
  Upload,
  Eye,
  EyeOff,
  Target,
  TrendingUp,
  Save,
  Edit3,
  Lock,
  Unlock
} from 'lucide-react';
import Button from '../UI/Button';
import { Assignment, AssignmentSubmission, AssignmentResult } from '../../types/assignment';
import { getTimeRemaining, isAssignmentOverdue, canEditAssignment } from '../../services/assignmentService';

interface AssignmentInterfaceProps {
  assignment: Assignment;
  onSubmit: (answers: Record<string, any>, isFinal: boolean) => void;
  onCancel: () => void;
  onStart: () => void;
  isLoading: boolean;
  latestSubmission: AssignmentSubmission | null;
  assignmentResult: AssignmentResult | null;
  canSubmit: boolean;
  onRetake?: () => void;
  onGoBack?: () => void;
}

const AssignmentInterface: React.FC<AssignmentInterfaceProps> = ({
  assignment,
  onSubmit,
  onCancel,
  onStart,
  isLoading,
  latestSubmission,
  assignmentResult,
  canSubmit,
  onRetake,
  onGoBack
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [assignmentStarted, setAssignmentStarted] = useState(false);
  const [assignmentCompleted, setAssignmentCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const isOverdue = isAssignmentOverdue(assignment);
  const timeLeft = getTimeRemaining(assignment.dueDate);
  const canEdit = canEditAssignment(assignment);
  const deadlinePassed = assignmentResult?.deadlinePassed || false;

  useEffect(() => {
    if (assignment.timeLimit && assignmentStarted && !assignmentCompleted) {
      setTimeRemaining(assignment.timeLimit * 60); // Convert minutes to seconds
    }
  }, [assignment.timeLimit, assignmentStarted, assignmentCompleted]);

  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && !assignmentCompleted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !assignmentCompleted) {
      handleAutoSubmit(); // Auto-submit when time runs out
    }
  }, [timeRemaining, assignmentCompleted]);
  useEffect(() => {
    if (latestSubmission && !assignmentStarted) {
      setAnswers(latestSubmission.answers || {});
      if (latestSubmission.isSubmitted) {
        setAssignmentCompleted(true);
        // Only show results if deadline has passed
        if (deadlinePassed) {
          setShowResults(true);
        }
      }
    }
  }, [latestSubmission, assignmentStarted, deadlinePassed]);

  useEffect(() => {
    if (hasUnsavedChanges && assignmentStarted && !assignmentCompleted && canEdit) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 3000);
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [answers, hasUnsavedChanges]);

  const handleStart = () => {
    setAssignmentStarted(true);
    setAssignmentCompleted(false);
    setShowResults(false);
    setAnswers({});
    onStart();
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    setHasUnsavedChanges(true);
  };

  const handleAutoSave = async () => {
    if (hasUnsavedChanges && canEdit) {
      try {
        await onSubmit(answers, false);
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  };

  const handleAutoSubmit = async () => {
    if (assignmentStarted && !assignmentCompleted) {
      try {
        onSubmit(answers, true);
        setAssignmentCompleted(true);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Auto-submit failed:', error);
      }
    }
  };

  const handleFinalSubmit = async () => {
    try {
      onSubmit(answers, true);
      setAssignmentCompleted(true);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Final submit failed:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = (): number => {
    return Object.keys(answers).filter(key => {
      const answer = answers[key];
      return answer !== undefined && answer !== '' && answer !== null;
    }).length;
  };

  const canSubmitAssignment = (): boolean => {
    return getAnsweredCount() === assignment.questions.length;
  };

  // Full screen overlay
  const overlayClasses = "fixed inset-0 z-50 bg-dark-900 overflow-y-auto";

  // Assignment Results View - Only show if deadline has passed
  if (showResults && assignmentResult && deadlinePassed) {
    const { submission, feedback, canViewAnswers } = assignmentResult;
    
    return (
      <div className={overlayClasses}>
        <div className="min-h-screen p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onGoBack || onCancel} icon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
              <h1 className="text-2xl font-bold text-white">Assignment Results</h1>
            </div>
            <Button variant="ghost" onClick={onCancel} icon={<X className="h-4 w-4" />} />
          </div>

          {/* Results Summary */}
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-dark-800 rounded-xl p-8 text-center">
              <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
                submission.score && submission.score >= 70 ? 'bg-accent-600' : 'bg-orange-600'
              }`}>
                {submission.score && submission.score >= 70 ? (
                  <CheckCircle className="h-12 w-12 text-white" />
                ) : (
                  <Clock className="h-12 w-12 text-white" />
                )}
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-2">
                {submission.score && submission.score >= 70 ? 'Assignment Complete!' : 'Assignment Submitted'}
              </h2>
              
              <p className="text-xl text-dark-300 mb-6">
                {submission.score !== undefined
                  ? `You scored ${submission.score}% on ${assignment.title}`
                  : `Your submission for ${assignment.title} has been received`
                }
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-white mb-1">
                    {submission.score !== undefined ? `${submission.score}%` : 'Pending'}
                  </div>
                  <div className="text-dark-400">Your Score</div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-white mb-1">{assignment.totalPoints}</div>
                  <div className="text-dark-400">Total Points</div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-white mb-1">
                    {submission.isLate ? 'Late' : 'On Time'}
                  </div>
                  <div className="text-dark-400">Submission Status</div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-white mb-1">
                    {Math.floor(submission.timeSpent / 60)}m
                  </div>
                  <div className="text-dark-400">Time Spent</div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button onClick={onGoBack || onCancel} icon={<ArrowLeft className="h-4 w-4" />}>
                  Back to Course
                </Button>
                {canSubmit && (
                  <Button 
                    variant="outline" 
                    onClick={onRetake}
                    icon={<FileText className="h-4 w-4" />}
                  >
                    Submit Again
                  </Button>
                )}
              </div>
            </div>

            {/* Detailed Results - Only show if answers can be viewed */}
            {canViewAnswers && feedback && (
              <div className="bg-dark-800 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Question Review</h3>
                
                <div className="space-y-6">
                  {assignment.questions.map((question, index) => {
                    const questionFeedback = feedback.find(f => f.questionId === question.id);
                    if (!questionFeedback) return null;

                    return (
                      <div key={question.id} className="bg-dark-700 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              questionFeedback.isCorrect ? 'bg-accent-600' : 'bg-orange-600'
                            }`}>
                              {questionFeedback.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-white" />
                              ) : (
                                <XCircle className="h-5 w-5 text-white" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-dark-300">Question {index + 1}</span>
                          </div>
                          <span className="text-sm text-dark-400">
                            {questionFeedback.earnedPoints}/{question.points} pts
                          </span>
                        </div>

                        <h4 className="text-white font-medium mb-4">{question.text}</h4>

                        {question.type === 'multiple-choice' && question.options && (
                          <div className="space-y-2 mb-4">
                            {question.options.map((option, optIndex) => {
                              const isUserAnswer = questionFeedback.userAnswer === optIndex;
                              const isCorrectAnswer = questionFeedback.correctAnswer === optIndex;
                              
                              return (
                                <div
                                  key={optIndex}
                                  className={`p-3 rounded-lg border-2 ${
                                    isCorrectAnswer
                                      ? 'border-accent-600 bg-accent-600/10'
                                      : isUserAnswer && !isCorrectAnswer
                                      ? 'border-orange-600 bg-orange-600/10'
                                      : 'border-dark-600'
                                  }`}
                                >
                                  <div className="flex items-center">
                                    <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                                      isCorrectAnswer
                                        ? 'border-accent-600 bg-accent-600'
                                        : isUserAnswer && !isCorrectAnswer
                                        ? 'border-orange-600 bg-orange-600'
                                        : 'border-dark-400'
                                    }`}>
                                      {(isCorrectAnswer || (isUserAnswer && !isCorrectAnswer)) && (
                                        <div className="w-2 h-2 rounded-full bg-white mx-auto mt-0.5" />
                                      )}
                                    </div>
                                    <span className={`${
                                      isCorrectAnswer
                                        ? 'text-accent-400'
                                        : isUserAnswer && !isCorrectAnswer
                                        ? 'text-orange-400'
                                        : 'text-white'
                                    }`}>
                                      {option}
                                    </span>
                                    {isCorrectAnswer && (
                                      <span className="ml-2 text-xs text-accent-400 font-medium">Correct</span>
                                    )}
                                    {isUserAnswer && !isCorrectAnswer && (
                                      <span className="ml-2 text-xs text-orange-400 font-medium">Your Answer</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {(question.type === 'short-answer' || question.type === 'essay') && (
                          <div className="space-y-3 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-dark-300 mb-1">Your Answer:</label>
                              <div className="p-3 rounded-lg border-2 border-dark-600 bg-dark-600/10">
                                <span className="text-white">
                                  {questionFeedback.userAnswer || 'No answer provided'}
                                </span>
                              </div>
                            </div>
                            {questionFeedback.correctAnswer && (
                              <div>
                                <label className="block text-sm font-medium text-dark-300 mb-1">Correct Answer:</label>
                                <div className="p-3 rounded-lg border-2 border-accent-600 bg-accent-600/10">
                                  <span className="text-accent-400">{questionFeedback.correctAnswer}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {questionFeedback.explanation && (
                          <div className="bg-dark-600 p-4 rounded-lg">
                            <h5 className="text-sm font-medium text-white mb-2">Explanation:</h5>
                            <p className="text-dark-300 text-sm">{questionFeedback.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show submission confirmation if assignment is completed but deadline hasn't passed
  if (assignmentCompleted && !deadlinePassed) {
    return (
      <div className={overlayClasses}>
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <div className="bg-dark-800 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-4">Assignment Submitted!</h2>
              <p className="text-dark-300 mb-6">
                Your assignment has been successfully submitted. Results will be available after the deadline.
              </p>
              
              <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-center text-blue-400 mb-2">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="font-medium">Results Available After Deadline</span>
                </div>
                <p className="text-blue-300 text-sm">
                  Deadline: {new Date(assignment.dueDate).toLocaleString()}
                </p>
                <p className="text-blue-300 text-sm mt-1">
                  Time remaining: {timeLeft}
                </p>
              </div>
              
              <div className="flex justify-center space-x-4">
                <Button onClick={onGoBack || onCancel} icon={<ArrowLeft className="h-4 w-4" />}>
                  Back to Course
                </Button>
                {canEdit && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setAssignmentCompleted(false);
                      setShowResults(false);
                    }}
                    icon={<Edit3 className="h-4 w-4" />}
                  >
                    Edit Answers
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    }
  };

  // Assignment Instructions View
  if (!assignmentStarted) {
    return (
      <div className={overlayClasses}>
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-white">Assignment Instructions</h1>
              <Button variant="ghost" onClick={onCancel} icon={<X className="h-4 w-4" />} />
            </div>

            <div className="bg-dark-800 rounded-xl p-8 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{assignment.title}</h3>
                {assignment.description && (
                  <p className="text-dark-300">{assignment.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary-400 mb-1">{assignment.questions.length}</div>
                  <div className="text-sm text-dark-300">Questions</div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary-400 mb-1">
                    {assignment.timeLimit ? `${assignment.timeLimit}m` : '∞'}
                  </div>
                  <div className="text-sm text-dark-300">Time Limit</div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-accent-400 mb-1">{assignment.totalPoints}</div>
                  <div className="text-sm text-dark-300">Total Points</div>
                </div>
              </div>

              <div className="bg-dark-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-white font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Due Date
                  </h4>
                  <span className={`text-sm font-medium ${isOverdue ? 'text-red-400' : 'text-accent-400'}`}>
                    {timeLeft}
                  </span>
                </div>
                <p className="text-dark-300 text-sm">
                  {new Date(assignment.dueDate).toLocaleString()}
                </p>
              </div>

              {assignment.instructions && (
                <div className="bg-dark-700 p-4 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Instructions:</h4>
                  <p className="text-dark-300 text-sm">{assignment.instructions}</p>
                </div>
              )}

              <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1 text-blue-200">
                      <li>• Your answers are automatically saved as you work</li>
                      <li>• You can edit your answers until the deadline</li>
                      <li>• Results will be shown after the deadline passes</li>
                      {assignment.timeLimit && <li>• The assignment will auto-submit when time runs out</li>}
                      <li>• You have {assignment.maxAttempts} attempt{assignment.maxAttempts > 1 ? 's' : ''} to complete this assignment</li>
                      {assignment.allowLateSubmission && (
                        <li>• Late submissions are allowed with a {assignment.latePenalty}% penalty per day</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
                <Button onClick={handleStart} size="lg" disabled={!canSubmit}>
                  {canSubmit ? 'Start Assignment' : 'Cannot Submit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assignment Taking View
  return (
    <div className={overlayClasses}>
      <div className="min-h-screen p-6">
        {/* Header */}
        <div className="sticky top-0 bg-dark-900 z-10 pb-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onCancel} icon={<ArrowLeft className="h-4 w-4" />}>
                Exit Assignment
              </Button>
              <h1 className="text-2xl font-bold text-white">{assignment.title}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {timeRemaining !== null && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-600/20 text-red-400' : 'bg-dark-700 text-dark-300'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
                </div>
              )}
              
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                isOverdue ? 'bg-red-600/20 text-red-400' : 'bg-dark-700 text-dark-300'
              }`}>
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{timeLeft}</span>
              </div>

              {!canEdit && (
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-orange-600/20 text-orange-400">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm">Deadline Passed</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-dark-400 whitespace-nowrap">
              Progress: {getAnsweredCount()}/{assignment.questions.length}
            </span>
            <div className="flex-1 bg-dark-600 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getAnsweredCount() / assignment.questions.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-dark-400">
              {Math.round((getAnsweredCount() / assignment.questions.length) * 100)}%
            </span>
          </div>

          {/* Auto-save indicator */}
          {canEdit && (
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges ? (
                  <span className="text-orange-400">Unsaved changes...</span>
                ) : lastSaved ? (
                  <span className="text-accent-400">
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </span>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAutoSave()}
                disabled={!hasUnsavedChanges}
                icon={<Save className="h-3 w-3" />}
              >
                Save Draft
              </Button>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="max-w-4xl mx-auto space-y-8">
          {assignment.questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    answers[question.id] !== undefined && answers[question.id] !== ''
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-600 text-dark-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-dark-300">
                      Question {index + 1} of {assignment.questions.length}
                    </span>
                    {question.required && (
                      <span className="ml-2 text-xs px-2 py-1 bg-red-600 text-white rounded">Required</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-dark-400">{question.points} pts</span>
              </div>

              <h3 className="text-lg font-medium text-white mb-6">{question.text}</h3>

              {question.type === 'multiple-choice' && question.options && (
                <div className="space-y-3">
                  {question.options.map((option, optIndex) => (
                    <label
                      key={optIndex}
                      className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                        canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                      } ${
                        answers[question.id] === optIndex
                          ? 'border-primary-600 bg-primary-600/10'
                          : 'border-dark-600 hover:border-dark-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={optIndex}
                        checked={answers[question.id] === optIndex}
                        onChange={() => canEdit && handleAnswerChange(question.id, optIndex)}
                        disabled={!canEdit}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                        answers[question.id] === optIndex
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-dark-400'
                      }`}>
                        {answers[question.id] === optIndex && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-white flex-1">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'short-answer' && (
                <textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => canEdit && handleAnswerChange(question.id, e.target.value)}
                  disabled={!canEdit}
                  placeholder={canEdit ? "Enter your answer..." : "Answer locked after deadline"}
                  className="w-full p-4 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={3}
                />
              )}

              {question.type === 'essay' && (
                <textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => canEdit && handleAnswerChange(question.id, e.target.value)}
                  disabled={!canEdit}
                  placeholder={canEdit ? "Write your essay response..." : "Answer locked after deadline"}
                  className="w-full p-4 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={8}
                />
              )}

              {question.type === 'file-upload' && (
                <div className={`border-2 border-dashed border-dark-600 rounded-lg p-8 text-center ${
                  !canEdit ? 'opacity-50' : ''
                }`}>
                  <Upload className="h-12 w-12 text-dark-400 mx-auto mb-4" />
                  <p className="text-dark-300 mb-4">
                    {canEdit ? "Upload your file here" : "File upload locked after deadline"}
                  </p>
                  <Button 
                    variant="outline" 
                    icon={<Upload className="h-4 w-4" />}
                    disabled={!canEdit}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </motion.div>
          ))}

          {/* Submit Section */}
          <div className="bg-dark-800 rounded-xl p-6 text-center">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                {canEdit ? 'Ready to Submit?' : 'Assignment Submitted'}
              </h3>
              <p className="text-dark-300">
                You have answered {getAnsweredCount()} out of {assignment.questions.length} questions.
              </p>
              {canEdit && !canSubmitAssignment() && (
                <p className="text-orange-400 text-sm mt-2">
                  Please answer all questions before submitting.
                </p>
              )}
              {!canEdit && (
                <p className="text-blue-400 text-sm mt-2">
                  The deadline has passed. You can no longer edit your answers.
                </p>
              )}
            </div>

            <div className="flex justify-center space-x-3">
              {canEdit ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleAutoSave()}
                    disabled={!hasUnsavedChanges}
                    icon={<Save className="h-4 w-4" />}
                  >
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={!canSubmitAssignment() || isLoading}
                    loading={isLoading}
                    size="lg"
                    icon={<Send className="h-4 w-4" />}
                  >
                    Submit Final Answer
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowResults(true)}
                  icon={<Eye className="h-4 w-4" />}
                  disabled={!deadlinePassed}
                >
                  {deadlinePassed ? 'View Results' : 'Results Available After Deadline'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentInterface;
    return (
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8"
        >
          <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              assignmentResult.passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {assignmentResult.passed ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Assignment Results</h1>
            <p className="text-gray-600">{assignment.title}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {assignmentResult.score}/{assignment.totalPoints}
              </div>
              <p className="text-gray-600">Score</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {Math.round(assignmentResult.percentage)}%
              </div>
              <p className="text-gray-600">Percentage</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold mb-1 ${
                assignmentResult.passed ? 'text-green-600' : 'text-red-600'
              }`}>
                {assignmentResult.passed ? 'PASSED' : 'FAILED'}
              </div>
              <p className="text-gray-600">Status</p>
            </div>
          </div>

          {assignmentResult.feedback && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Instructor Feedback</h3>
              <p className="text-blue-800">{assignmentResult.submission.feedback}</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={onGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
            {onRetake && assignment.allowRetakes && (
              <Button onClick={onRetake} className="bg-blue-600 hover:bg-blue-700">
                Retake Assignment
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = assignment.questions[currentQuestionIndex];
  const progress = getQuestionProgress();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg"
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
            <div className="flex items-center space-x-4">
              {assignment.timeLimit && timeRemaining && (
                <div className="flex items-center space-x-2 text-orange-600">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{timeRemaining}</span>
                </div>
              )}
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2 text-yellow-600">
                  <Save className="w-4 h-4" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              )}
              {lastSaved && (
                <div className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Question {currentQuestionIndex + 1} of {assignment.questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>

        {/* Question Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {currentQuestion.question}
                </h2>
                {renderQuestion(currentQuestion)}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === assignment.questions.length - 1}
              >
                Next
              </Button>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showPreview ? 'Hide Preview' : 'Preview Answers'}
              </Button>
              
              {canEdit && (
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isLoading || !canSubmit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Submit Assignment
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Answer Preview Modal */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowPreview(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">Answer Preview</h3>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {assignment.questions.map((question, index) => (
                    <div key={question.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </h4>
                      <div className="text-gray-600">
                        {answers[question.id] ? (
                          <span className="text-green-600">✓ Answered: {answers[question.id]}</span>
                        ) : (
                          <span className="text-red-500">✗ Not answered</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AssignmentInterface;