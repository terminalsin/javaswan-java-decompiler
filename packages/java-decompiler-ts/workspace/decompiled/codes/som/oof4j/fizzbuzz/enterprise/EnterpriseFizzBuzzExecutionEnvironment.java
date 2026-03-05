package codes.som.oof4j.fizzbuzz.enterprise;

public class EnterpriseFizzBuzzExecutionEnvironment {
  private static final EnterpriseFizzBuzzExecutionEnvironment INSTANCE;
  private int iterations;
  
  public static EnterpriseFizzBuzzExecutionEnvironment getInstance() {
    return INSTANCE;
  }
  
  public int getIterations() {
    return this.iterations;
  }
  
  public void setIterations(int iterations) {
    this.iterations = iterations;
  }
  
  static {
    INSTANCE = new EnterpriseFizzBuzzExecutionEnvironment();
  }
}