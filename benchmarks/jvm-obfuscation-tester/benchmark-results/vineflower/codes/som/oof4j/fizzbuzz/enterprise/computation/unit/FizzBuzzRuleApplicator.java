package codes.som.oof4j.fizzbuzz.enterprise.computation.unit;

public class FizzBuzzRuleApplicator {
  private static final int DIVISIBLE_BY_THREE = 1;
  private static final int DIVISIBLE_BY_FIVE = 2;

  public static void applyAllRules(int number, Flags flags) {
    if (number % 3 == 0) {
      flags.setValue(flags.getValue() | 1);
    }

    if (number % 5 == 0) {
      flags.setValue(flags.getValue() | 2);
    }
  }
}
