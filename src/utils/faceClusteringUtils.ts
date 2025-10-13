/**
 * Face Clustering Utilities
 *
 * This module provides functions to cluster face images by identity,
 * helping to group multiple images of the same person together.
 */

import * as faceapi from '@vladmandic/face-api';

/**
 * Interface for a face descriptor with metadata
 */
export interface FaceDescriptorWithMetadata {
  descriptor: Float32Array;
  imageIndex: number;
  faceIndex: number;
  label?: string;
}

/**
 * Interface for a face cluster
 */
export interface FaceCluster {
  centroid: Float32Array;
  members: FaceDescriptorWithMetadata[];
  label: string;
}

/**
 * Calculate Euclidean distance between two face descriptors
 */
export const calculateDistance = (
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number => {
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Calculate the centroid of a cluster
 */
export const calculateCentroid = (
  descriptors: Float32Array[]
): Float32Array => {
  const length = descriptors[0].length;
  const centroid = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const descriptor of descriptors) {
      sum += descriptor[i];
    }
    centroid[i] = sum / descriptors.length;
  }

  return centroid;
};

/**
 * Cluster face descriptors using a modified DBSCAN algorithm
 *
 * @param faceDescriptors Array of face descriptors with metadata
 * @param threshold Distance threshold for considering faces as the same identity
 * @returns Array of face clusters
 */
export const clusterFaceDescriptors = (
  faceDescriptors: FaceDescriptorWithMetadata[],
  threshold: number = 0.5
): FaceCluster[] => {
  if (faceDescriptors.length === 0) {
    return [];
  }

  // Initialize clusters
  const clusters: FaceCluster[] = [];
  const visited = new Set<number>();

  // Process each descriptor
  for (let i = 0; i < faceDescriptors.length; i++) {
    if (visited.has(i)) continue;

    visited.add(i);
    const currentDescriptor = faceDescriptors[i];
    const neighbors: FaceDescriptorWithMetadata[] = [currentDescriptor];

    // Find all neighbors
    for (let j = 0; j < faceDescriptors.length; j++) {
      if (i === j || visited.has(j)) continue;

      const distance = calculateDistance(
        currentDescriptor.descriptor,
        faceDescriptors[j].descriptor
      );

      if (distance < threshold) {
        neighbors.push(faceDescriptors[j]);
        visited.add(j);
      }
    }

    // Create a new cluster
    const descriptorArray = neighbors.map(n => n.descriptor);
    const centroid = calculateCentroid(descriptorArray);

    clusters.push({
      centroid,
      members: neighbors,
      label: `Person_${clusters.length + 1}`
    });
  }

  return clusters;
};

/**
 * Verify if a new face belongs to an existing cluster
 *
 * @param descriptor Face descriptor to verify
 * @param clusters Existing face clusters
 * @param threshold Distance threshold for considering a match
 * @returns The matching cluster or null if no match
 */
export const verifyFaceIdentity = (
  descriptor: Float32Array,
  clusters: FaceCluster[],
  threshold: number = 0.5
): FaceCluster | null => {
  let bestMatch: FaceCluster | null = null;
  let minDistance = threshold;

  for (const cluster of clusters) {
    const distance = calculateDistance(descriptor, cluster.centroid);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = cluster;
    }
  }

  return bestMatch;
};

/**
 * Create a face matcher that uses clustered identities
 *
 * @param clusters Array of face clusters
 * @returns A LabeledFaceDescriptors array for use with FaceMatcher
 */
export const createClusteredFaceMatcher = (
  clusters: FaceCluster[]
): faceapi.LabeledFaceDescriptors[] => {
  return clusters.map(cluster => {
    const descriptors = cluster.members.map(member => member.descriptor);
    return new faceapi.LabeledFaceDescriptors(cluster.label, descriptors);
  });
};

/**
 * Analyze reference images to detect if they contain different people
 *
 * @param descriptors Array of face descriptors from reference images
 * @returns Object with analysis results
 */
export const analyzeReferenceImages = (
  descriptors: FaceDescriptorWithMetadata[]
): {
  hasMixedIdentities: boolean;
  clusters: FaceCluster[];
  dominantCluster: FaceCluster | null;
  outliers: FaceDescriptorWithMetadata[];
} => {
  // Cluster the descriptors
  const clusters = clusterFaceDescriptors(descriptors, 0.5);

  // If we have only one cluster, all images are likely the same person
  if (clusters.length <= 1) {
    return {
      hasMixedIdentities: false,
      clusters,
      dominantCluster: clusters[0] || null,
      outliers: []
    };
  }

  // Find the dominant cluster (with most members)
  let dominantCluster = clusters[0];
  for (const cluster of clusters) {
    if (cluster.members.length > dominantCluster.members.length) {
      dominantCluster = cluster;
    }
  }

  // Collect outliers (faces not in the dominant cluster)
  const outliers: FaceDescriptorWithMetadata[] = [];
  for (const cluster of clusters) {
    if (cluster !== dominantCluster) {
      outliers.push(...cluster.members);
    }
  }

  return {
    hasMixedIdentities: true,
    clusters,
    dominantCluster,
    outliers
  };
};

/**
 * Enhanced face matching that uses multiple verification steps with extremely strict criteria
 * to eliminate false positives
 *
 * @param descriptor Face descriptor to match
 * @param clusters Face clusters to match against
 * @param strictThreshold Threshold for strict matching
 * @param looseThreshold Threshold for loose matching
 * @returns Match result with confidence and verification level
 */
export const enhancedFaceMatching = (
  descriptor: Float32Array,
  clusters: FaceCluster[],
  strictThreshold: number = 0.4,
  looseThreshold: number = 0.6
): {
  isMatch: boolean;
  confidence: number;
  matchedCluster: FaceCluster | null;
  verificationLevel: 'high' | 'medium' | 'low' | 'none';
  secondBestDistance?: number; // Distance to second-best match for comparison
  distanceRatio?: number; // Ratio between best and second-best match
  individualMatches?: number; // Number of individual descriptors that matched
  totalDescriptors?: number; // Total number of descriptors in the cluster
} => {
  if (clusters.length === 0) {
    return {
      isMatch: false,
      confidence: 0,
      matchedCluster: null,
      verificationLevel: 'none'
    };
  }

  // Find the best and second-best matching clusters
  let bestMatch: FaceCluster | null = null;
  let secondBestMatch: FaceCluster | null = null;
  let bestDistance = Number.MAX_VALUE;
  let secondBestDistance = Number.MAX_VALUE;

  // Track individual descriptor matches for each cluster
  const clusterMatches: Map<FaceCluster, { matches: number, totalDescriptors: number }> = new Map();

  // First pass: Calculate centroid distances to find potential matches
  for (const cluster of clusters) {
    const distance = calculateDistance(descriptor, cluster.centroid);

    if (distance < bestDistance) {
      // Current best becomes second best
      secondBestDistance = bestDistance;
      secondBestMatch = bestMatch;

      // Update best match
      bestDistance = distance;
      bestMatch = cluster;
    } else if (distance < secondBestDistance) {
      // Update second best
      secondBestDistance = distance;
      secondBestMatch = cluster;
    }
  }

  // Second pass: For the best and second-best clusters, check individual descriptor matches
  // This gives us a more detailed view of how well the face matches each cluster
  if (bestMatch) {
    // Check how many individual descriptors in the best cluster match well
    let matchCount = 0;
    const individualThreshold = strictThreshold + 0.05; // Slightly more lenient for individual matches

    for (const member of bestMatch.members) {
      const distance = calculateDistance(descriptor, member.descriptor);
      if (distance < individualThreshold) {
        matchCount++;
      }
    }

    clusterMatches.set(bestMatch, {
      matches: matchCount,
      totalDescriptors: bestMatch.members.length
    });
  }

  if (secondBestMatch) {
    // Also check second best for comparison
    let matchCount = 0;
    const individualThreshold = strictThreshold + 0.05;

    for (const member of secondBestMatch.members) {
      const distance = calculateDistance(descriptor, member.descriptor);
      if (distance < individualThreshold) {
        matchCount++;
      }
    }

    clusterMatches.set(secondBestMatch, {
      matches: matchCount,
      totalDescriptors: secondBestMatch.members.length
    });
  }

  // Calculate confidence (0-100%)
  const confidence = Math.max(0, Math.min(100, (1 - bestDistance) * 100));

  // Calculate distance ratio between best and second-best match
  // A smaller ratio means the best match is significantly better than the second best
  const distanceRatio = secondBestMatch ? bestDistance / secondBestDistance : 1.0;

  // Get individual match statistics for the best cluster
  const bestMatchStats = bestMatch ? clusterMatches.get(bestMatch) : undefined;
  const individualMatches = bestMatchStats ? bestMatchStats.matches : 0;
  const totalDescriptors = bestMatchStats ? bestMatchStats.totalDescriptors : 0;
  const matchRatio = totalDescriptors > 0 ? individualMatches / totalDescriptors : 0;

  // Determine verification level based on multiple criteria
  let verificationLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
  let isMatch = false;

  if (bestMatch) {
    // ULTRA STRICT MATCHING CRITERIA

    // High verification: Extremely close match AND significantly better than second best
    // AND multiple individual descriptors match well
    if (bestDistance < strictThreshold * 0.9 && // 10% stricter than the strict threshold
        distanceRatio < 0.65 && // Must be significantly better than second best
        matchRatio >= 0.6) { // At least 60% of individual descriptors must match well
      verificationLevel = 'high';
      isMatch = true;
    }
    // Medium verification: Very close match with good separation from second best
    // AND some individual descriptors match well
    else if (bestDistance < strictThreshold &&
             distanceRatio < 0.75 &&
             matchRatio >= 0.4 && // At least 40% of individual descriptors must match
             individualMatches >= 2) { // At least 2 individual descriptors must match well
      // For medium matches, require more evidence based on cluster size
      if (bestMatch.members.length >= 3) {
        verificationLevel = 'medium';
        isMatch = true;
      } else {
        // Smaller clusters need to be even more distinctive
        verificationLevel = 'low';
        isMatch = distanceRatio < 0.6; // Extremely strict for small clusters
      }
    }
    // Low verification: Close match but not very distinctive
    // Only match if we have strong evidence
    else if (bestDistance < strictThreshold + 0.05 &&
             distanceRatio < 0.8 &&
             individualMatches >= 1) {
      verificationLevel = 'low';
      isMatch = bestMatch.members.length >= 3; // Only match if we have several examples
    }
  }

  // Additional check: If confidence is too low, don't match regardless
  if (confidence < 40) { // Minimum 40% confidence required
    isMatch = false;
    verificationLevel = 'none';
  }

  // Additional check: If the second best match is too close, be more cautious
  if (isMatch && secondBestMatch && distanceRatio > 0.85) {
    // If second best is very close, downgrade or reject
    if (verificationLevel === 'high') verificationLevel = 'medium';
    else if (verificationLevel === 'medium') verificationLevel = 'low';
    else {
      isMatch = false;
      verificationLevel = 'none';
    }
  }

  return {
    isMatch,
    confidence,
    matchedCluster: bestMatch,
    verificationLevel,
    secondBestDistance,
    distanceRatio,
    individualMatches,
    totalDescriptors
  };
};
