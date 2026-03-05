package dev.sim0n.iridium.math.statistic.function;

import dev.sim0n.iridium.math.helper.CommonMathFunctions;

public interface BiStatisticFunction extends CommonMathFunctions {
  double evaluate(final double[] p0, final double[] p1);
}
