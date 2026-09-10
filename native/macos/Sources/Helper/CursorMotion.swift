import CoreGraphics
import Foundation

/// Distance a pointer covers while it accelerates from rest up to `speed`.
private func rampUpDistance(speed: Double, acceleration: Double) -> Double {
    speed * speed / acceleration
}

/// Travel time of a trapezoidal speed profile, before the public clamp.
///
/// Below the ramp-up distance the pointer never reaches `speed`, so the whole
/// move is accelerate-then-decelerate and the two ramps collapse into one
/// `sqrt` term. Above it, the profile keeps a cruise leg in the middle.
private func trapezoidDuration(distance: Double, speed: Double, acceleration: Double) -> Double {
    let rampDistance = rampUpDistance(speed: speed, acceleration: acceleration)
    if distance <= rampDistance {
        return 2 * sqrt(distance / acceleration)
    }
    return 2 * speed / acceleration + (distance - rampDistance) / speed
}

/// One trapezoidal glide, split into the phases the animation walks through:
/// accelerate, cruise, decelerate.
///
/// Every field is derived from the same three inputs in one pass, so a caller
/// that needs the progress curve does not recompute the profile per frame.
private struct TrapezoidProfile {
    /// Unclamped travel time. The progress curve is piecewise on this value, not
    /// on the clamped duration `cursorMotionDuration` reports.
    let duration: Double
    /// Time spent accelerating; capped at half the travel so a short hop has no
    /// cruise leg at all.
    let rampTime: Double
    let cruiseTime: Double
    let rampDistance: Double
    let peakSpeed: Double
    let totalDistance: Double
    let acceleration: Double

    init(distance: Double, speed: Double, acceleration: Double) {
        let duration = trapezoidDuration(distance: distance, speed: speed, acceleration: acceleration)
        let rampTime = min(speed / acceleration, duration / 2)
        self.duration = duration
        self.rampTime = rampTime
        self.peakSpeed = acceleration * rampTime
        self.cruiseTime = max(0, duration - 2 * rampTime)
        self.rampDistance = 0.5 * acceleration * rampTime * rampTime
        self.totalDistance = distance
        self.acceleration = acceleration
    }

    /// Distance covered by the time `elapsed` of the glide has passed.
    func distance(after elapsed: Double) -> Double {
        if elapsed <= rampTime {
            return 0.5 * acceleration * elapsed * elapsed
        }
        if elapsed <= rampTime + cruiseTime {
            return rampDistance + peakSpeed * (elapsed - rampTime)
        }
        let remaining = duration - elapsed
        return totalDistance - 0.5 * acceleration * remaining * remaining
    }
}

/// Wall-clock length of a glide over `distance`, clamped to a range a viewer can
/// actually follow: never instant, never a full stop of the agent's work.
func cursorMotionDuration(distance: Double, speed: Double, acceleration: Double) -> Double {
    min(2, max(0.048, trapezoidDuration(distance: distance, speed: speed, acceleration: acceleration)))
}

/// Fraction of `distance` covered by the time `progress` of the glide has
/// passed, in `0...1`. `progress` is normalized against the unclamped duration,
/// so the curve stays smooth even where the public duration was clamped.
func cursorMotionFraction(
    progress: Double,
    distance: Double,
    speed: Double,
    acceleration: Double
) -> Double {
    guard distance > 0 else { return 1 }
    let profile = TrapezoidProfile(distance: distance, speed: speed, acceleration: acceleration)
    let elapsed = min(1, max(0, progress)) * profile.duration
    return min(1, max(0, profile.distance(after: elapsed) / distance))
}

/// One coordinate of a cubic Bezier at `fraction`, evaluated in the same order
/// the curve is written: p0, then p1, p2, p3.
private func bezierCoordinate(
    from start: Double,
    _ controlA: Double,
    _ controlB: Double,
    to end: Double,
    at fraction: Double
) -> Double {
    let inverse = 1 - fraction
    return inverse * inverse * inverse * start
        + 3 * inverse * inverse * fraction * controlA
        + 3 * inverse * fraction * fraction * controlB
        + fraction * fraction * fraction * end
}

/// Where the pointer sits partway along a glide from `origin` to `target`.
///
/// The path is not a straight line: it bows to one side by up to 18 points, so a
/// move reads as a hand rather than a teleport. Which side is derived from the
/// endpoints themselves, keeping the bow stable for a given pair of points.
func cursorMotionPoint(from origin: CGPoint, to target: CGPoint, fraction: Double) -> CGPoint {
    let distance = hypot(target.x - origin.x, target.y - origin.y)
    guard distance > 0 else { return target }
    let delta = CGPoint(x: target.x - origin.x, y: target.y - origin.y)
    let bowSign: CGFloat = Int(abs(origin.x + origin.y + target.x + target.y)) % 2 == 0 ? 1 : -1
    let bow = min(18, distance * 0.06) * bowSign
    let normal = CGPoint(x: -delta.y / distance, y: delta.x / distance)
    let early = CGPoint(
        x: origin.x + delta.x * 0.32 + normal.x * bow,
        y: origin.y + delta.y * 0.32 + normal.y * bow
    )
    let late = CGPoint(
        x: origin.x + delta.x * 0.72 + normal.x * bow * 0.45,
        y: origin.y + delta.y * 0.72 + normal.y * bow * 0.45
    )
    return CGPoint(
        x: bezierCoordinate(
            from: Double(origin.x),
            Double(early.x),
            Double(late.x),
            to: Double(target.x),
            at: fraction
        ),
        y: bezierCoordinate(
            from: Double(origin.y),
            Double(early.y),
            Double(late.y),
            to: Double(target.y),
            at: fraction
        )
    )
}
