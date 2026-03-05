package codes.som.oof4j.fizzbuzz.enterprise.computation.unit;

public class FizzBuzzRuleApplicator {
  private static final int DIVISIBLE_BY_THREE = 1;
  private static final int DIVISIBLE_BY_FIVE = 2;

  public static void applyAllRules(final int number, final Flags flags) {
    if (number % 3 == 0) {
      flags.setValue(flags.getValue() | 0x1);
    }
    if (number % 5 == 0) {
      flags.setValue(flags.getValue() | 0x2);
    }
  }
}
