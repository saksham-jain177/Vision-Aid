import React, { useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { FaceCluster, enhancedFaceMatching } from '../../utils/faceClusteringUtils';

interface FaceEncoding {
  descriptor: Float32Array;
  label: string;
}

/**
 * Enhanced face matching component that uses face clustering
 * to improve face recognition accuracy
 */
export const useEnhancedFaceMatching = (
  faceEncodings: FaceEncoding[],
  faceClusters: FaceCluster[],
  matchThreshold: number,
  frameCountRef: React.MutableRefObject<number>
) => {
  const [matchResults, setMatchResults] = useState<string>('');

  /**
   * Enhanced face matching function that uses clustering to improve accuracy
   */
  const matchFace = (descriptor: Float32Array): {
    isMatch: boolean;
    confidence: number;
    verificationLevel?: 'high' | 'medium' | 'low' | 'none';
    individualMatches?: number;
    totalDescriptors?: number;
    distanceRatio?: number;
  } => {
    if (faceEncodings.length === 0) {
      setMatchResults('No face encodings available for matching');
      return { isMatch: false, confidence: 0, verificationLevel: 'none' };
    }

    // Start building the match results string without clearing console
    let resultsLog = `Matching with threshold: ${matchThreshold.toFixed(2)} (lower is stricter)\n`;

    // If we have face clusters, use enhanced matching
    if (faceClusters.length > 0) {
      // Use enhanced face matching with clusters
      const strictThreshold = matchThreshold - 0.1; // Stricter threshold for high confidence matches
      const looseThreshold = matchThreshold + 0.1; // Looser threshold for low confidence matches

      const matchResult = enhancedFaceMatching(
        descriptor,
        faceClusters,
        strictThreshold,
        looseThreshold
      );

      // Log detailed results
      resultsLog += `\n=== ENHANCED MATCH RESULT ===\n`;
      resultsLog += `Match found: ${matchResult.isMatch ? 'YES' : 'NO'}\n`;
      resultsLog += `Confidence: ${matchResult.confidence.toFixed(2)}%\n`;
      resultsLog += `Verification level: ${matchResult.verificationLevel}\n`;
      resultsLog += `Matched cluster: ${matchResult.matchedCluster ? matchResult.matchedCluster.label : 'None'}\n`;

      // Add the new ratio information for better debugging
      if (matchResult.distanceRatio !== undefined) {
        resultsLog += `\n=== MATCH QUALITY METRICS ===\n`;
        // Calculate best distance as 1 - (confidence/100) to avoid undefined reference
        const bestDistance = 1 - (matchResult.confidence / 100);
        resultsLog += `Best match distance: ${bestDistance.toFixed(4)}\n`;
        resultsLog += `Second best distance: ${matchResult.secondBestDistance?.toFixed(4) || 'N/A'}\n`;
        resultsLog += `Distance ratio: ${matchResult.distanceRatio.toFixed(4)} (lower is better)\n`;
        resultsLog += `Cluster size: ${matchResult.matchedCluster?.members.length || 0} faces\n`;

        // Add individual descriptor match information
        if (matchResult.individualMatches !== undefined && matchResult.totalDescriptors !== undefined) {
          const matchRatio = matchResult.totalDescriptors > 0 ?
            (matchResult.individualMatches / matchResult.totalDescriptors) * 100 : 0;

          resultsLog += `Individual matches: ${matchResult.individualMatches}/${matchResult.totalDescriptors} `;
          resultsLog += `(${matchRatio.toFixed(1)}%)\n`;

          // Add a visual representation of the match quality
          resultsLog += `Match quality: `;
          if (matchRatio >= 60) {
            resultsLog += `EXCELLENT ★★★★★\n`;
          } else if (matchRatio >= 40) {
            resultsLog += `GOOD ★★★★☆\n`;
          } else if (matchRatio >= 20) {
            resultsLog += `FAIR ★★★☆☆\n`;
          } else if (matchRatio > 0) {
            resultsLog += `POOR ★★☆☆☆\n`;
          } else {
            resultsLog += `NONE ☆☆☆☆☆\n`;
          }
        }

        // Explain the match decision
        resultsLog += `\n=== MATCH DECISION EXPLANATION ===\n`;
        if (matchResult.isMatch) {
          resultsLog += `MATCH FOUND with ${matchResult.confidence.toFixed(2)}% confidence\n`;
          resultsLog += `Verification level: ${matchResult.verificationLevel.toUpperCase()}\n`;

          // Explain why this was considered a match
          resultsLog += `\nMatch criteria satisfied:\n`;

          if (bestDistance < strictThreshold * 0.9) {
            resultsLog += `✓ Distance (${bestDistance.toFixed(4)}) is excellent (below ${(strictThreshold * 0.9).toFixed(4)})\n`;
          } else if (bestDistance < strictThreshold) {
            resultsLog += `✓ Distance (${bestDistance.toFixed(4)}) is good (below ${strictThreshold.toFixed(4)})\n`;
          } else {
            resultsLog += `✓ Distance (${bestDistance.toFixed(4)}) is acceptable (below ${(strictThreshold + 0.05).toFixed(4)})\n`;
          }

          if (matchResult.distanceRatio < 0.65) {
            resultsLog += `✓ Highly distinctive match (ratio: ${matchResult.distanceRatio.toFixed(4)} < 0.65)\n`;
          } else if (matchResult.distanceRatio < 0.75) {
            resultsLog += `✓ Good distinction from other faces (ratio: ${matchResult.distanceRatio.toFixed(4)} < 0.75)\n`;
          } else {
            resultsLog += `✓ Acceptable distinction (ratio: ${matchResult.distanceRatio.toFixed(4)} < 0.8)\n`;
          }

          if (matchResult.individualMatches !== undefined && matchResult.totalDescriptors !== undefined) {
            const matchRatio = matchResult.totalDescriptors > 0 ?
              (matchResult.individualMatches / matchResult.totalDescriptors) * 100 : 0;

            if (matchRatio >= 60) {
              resultsLog += `✓ Excellent individual descriptor matches: ${matchResult.individualMatches}/${matchResult.totalDescriptors} (${matchRatio.toFixed(1)}%)\n`;
            } else if (matchRatio >= 40) {
              resultsLog += `✓ Good individual descriptor matches: ${matchResult.individualMatches}/${matchResult.totalDescriptors} (${matchRatio.toFixed(1)}%)\n`;
            } else {
              resultsLog += `✓ Sufficient individual matches: ${matchResult.individualMatches}/${matchResult.totalDescriptors} (${matchRatio.toFixed(1)}%)\n`;
            }
          }

          if (matchResult.matchedCluster && matchResult.matchedCluster.members.length >= 3) {
            resultsLog += `✓ Strong reference set: ${matchResult.matchedCluster.members.length} reference images\n`;
          }
        } else {
          resultsLog += `NO MATCH FOUND (${matchResult.confidence.toFixed(2)}% confidence)\n`;

          // Explain why this was rejected
          resultsLog += `\nRejection reasons:\n`;

          if (bestDistance > strictThreshold + 0.05) {
            resultsLog += `✗ Distance too high: ${bestDistance.toFixed(4)} > ${(strictThreshold + 0.05).toFixed(4)}\n`;
          }

          if (matchResult.distanceRatio >= 0.8) {
            resultsLog += `✗ Not distinctive enough: ratio ${matchResult.distanceRatio.toFixed(4)} ≥ 0.8\n`;
          }

          if (matchResult.individualMatches !== undefined && matchResult.totalDescriptors !== undefined) {
            const matchRatio = matchResult.totalDescriptors > 0 ?
              (matchResult.individualMatches / matchResult.totalDescriptors) * 100 : 0;

            if (matchRatio < 20) {
              resultsLog += `✗ Too few individual matches: ${matchResult.individualMatches}/${matchResult.totalDescriptors} (${matchRatio.toFixed(1)}%)\n`;
            }
          }

          if (matchResult.matchedCluster && matchResult.matchedCluster.members.length < 3) {
            resultsLog += `✗ Not enough reference images: ${matchResult.matchedCluster.members.length} (need at least 3)\n`;
          }

          if (matchResult.confidence < 40) {
            resultsLog += `✗ Confidence too low: ${matchResult.confidence.toFixed(2)}% < 40%\n`;
          }
        }
      }

      // Update the match results state
      setMatchResults(resultsLog);

      // Log to console occasionally to avoid spam
      if (frameCountRef.current % 15 === 0) {
        console.log('%cEnhanced Face Match Results', 'color: #8a2be2; font-weight: bold', matchResult);
      }

      return {
        isMatch: matchResult.isMatch,
        confidence: matchResult.confidence,
        verificationLevel: matchResult.verificationLevel,
        individualMatches: matchResult.individualMatches,
        totalDescriptors: matchResult.totalDescriptors,
        distanceRatio: matchResult.distanceRatio
      };
    } else {
      // Fall back to original matching algorithm if no clusters
      let bestMatch: {
        distance: number;
        isMatch: boolean;
        confidence: number;
        verificationLevel: 'high' | 'medium' | 'low' | 'none';
      } = {
        distance: Number.MAX_VALUE,
        isMatch: false,
        confidence: 0,
        verificationLevel: 'none'
      };

      // Group encodings by person (based on label prefix)
      const personEncodings: { [key: string]: FaceEncoding[] } = {};

      for (const encoding of faceEncodings) {
        // Extract image ID from label (e.g., "Image_1_2" -> "Image_1")
        const imageId = encoding.label.split('_').slice(0, 2).join('_');

        if (!personEncodings[imageId]) {
          personEncodings[imageId] = [];
        }

        personEncodings[imageId].push(encoding);
      }

      resultsLog += `Grouped encodings into ${Object.keys(personEncodings).length} images\n`;

      // For each image, calculate average distance across all their encodings
      for (const imageId in personEncodings) {
        try {
          const encodings = personEncodings[imageId];
          let totalDistance = 0;
          let minDistance = Number.MAX_VALUE;

          // Find the minimum distance among all encodings for this image
          resultsLog += `\nMatching against ${imageId}:\n`;
          for (const encoding of encodings) {
            const distance = faceapi.euclideanDistance(descriptor, encoding.descriptor);
            totalDistance += distance;
            minDistance = Math.min(minDistance, distance);
            resultsLog += `  - Distance to ${encoding.label}: ${distance.toFixed(4)}\n`;
          }

          // Calculate average distance (weighted toward minimum distance)
          const avgDistance = (minDistance * 0.7) + (totalDistance / encodings.length * 0.3);
          resultsLog += `  - Min distance: ${minDistance.toFixed(4)}, Avg weighted distance: ${avgDistance.toFixed(4)}\n`;

          // Update best match if this person is a better match
          if (avgDistance < bestMatch.distance) {
            const isMatch = avgDistance < matchThreshold;
            const confidence = (1 - avgDistance) * 100;

            // Determine verification level based on distance
            let verificationLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
            if (isMatch) {
              if (avgDistance < matchThreshold - 0.15) {
                verificationLevel = 'high';
              } else if (avgDistance < matchThreshold - 0.05) {
                verificationLevel = 'medium';
              } else {
                verificationLevel = 'low';
              }
            }

            bestMatch = {
              distance: avgDistance,
              isMatch,
              confidence,
              verificationLevel
            };

            resultsLog += `  - New best match: ${imageId}, distance: ${avgDistance.toFixed(4)}, ` +
                        `isMatch: ${isMatch}, confidence: ${confidence.toFixed(2)}%, verification: ${verificationLevel}\n`;
          }
        } catch (error) {
          resultsLog += `Error matching against image ${imageId}: ${error}\n`;
        }
      }

      // Add a summary of the best match
      resultsLog += `\n=== MATCH RESULT ===\n`;
      resultsLog += `Best match: ${bestMatch.isMatch ? 'MATCH FOUND' : 'NO MATCH'}\n`;
      resultsLog += `Confidence: ${bestMatch.confidence.toFixed(2)}%\n`;
      resultsLog += `Verification level: ${bestMatch.verificationLevel}\n`;
      resultsLog += `Distance: ${bestMatch.distance.toFixed(4)} (threshold: ${matchThreshold.toFixed(2)})\n`;

      // Update the match results state
      setMatchResults(resultsLog);

      // Use a single console.log with a dynamic label to avoid cluttering
      if (frameCountRef.current % 15 === 0) {
        // Use a consistent label so the browser can group identical console messages
        console.log('%cFace Match Results', 'color: #8a2be2; font-weight: bold', bestMatch);
      }

      return bestMatch;
    }
  };

  return {
    matchFace,
    matchResults
  };
};

export default useEnhancedFaceMatching;
