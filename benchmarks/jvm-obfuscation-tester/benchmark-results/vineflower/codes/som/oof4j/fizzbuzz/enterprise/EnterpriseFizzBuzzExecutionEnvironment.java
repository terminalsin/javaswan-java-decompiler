package codes.som.oof4j.fizzbuzz.enterprise;

public class EnterpriseFizzBuzzExecutionEnvironment {
  private static final EnterpriseFizzBuzzExecutionEnvironment INSTANCE =
      new EnterpriseFizzBuzzExecutionEnvironment();
  private int iterations = 100;

  public static EnterpriseFizzBuzzExecutionEnvironment getInstance() {
    return INSTANCE;
  }

  public int getIterations() {
    return this.iterations;
  }

  public void setIterations(int iterations) {
    this.iterations = iterations;
  }
}
