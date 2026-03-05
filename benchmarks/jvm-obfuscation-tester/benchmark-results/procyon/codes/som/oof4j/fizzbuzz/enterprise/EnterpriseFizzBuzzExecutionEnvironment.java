package codes.som.oof4j.fizzbuzz.enterprise;

public class EnterpriseFizzBuzzExecutionEnvironment {
  private static final EnterpriseFizzBuzzExecutionEnvironment INSTANCE;
  private int iterations;

  public EnterpriseFizzBuzzExecutionEnvironment() {
    this.iterations = 100;
  }

  public static EnterpriseFizzBuzzExecutionEnvironment getInstance() {
    return EnterpriseFizzBuzzExecutionEnvironment.INSTANCE;
  }

  public int getIterations() {
    return this.iterations;
  }

  public void setIterations(final int iterations) {
    this.iterations = iterations;
  }

  static {
    INSTANCE = new EnterpriseFizzBuzzExecutionEnvironment();
  }
}
